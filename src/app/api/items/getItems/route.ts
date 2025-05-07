import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize PostgreSQL connection pool
const pool = new Pool({
   connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
   // Get companyName from query parameters
   const searchParams = request.nextUrl.searchParams;
   const companyName = searchParams.get('companyName');

   console.log(`API called with companyName: ${companyName}`);

   // Validate companyName
   if (!companyName) {
      console.log('Company name is missing in request');
      return NextResponse.json(
         { success: false, message: 'Company name is required' },
         { status: 400 }
      );
   }

   const schemaName = companyName;
   console.log(`Using schema name: ${schemaName}`);

   let client;
   try {
      client = await pool.connect();

      // Check if schema exists
      console.log(`Checking if schema '${schemaName}' exists...`);
      const schemaCheck = await client.query(
         'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
         [schemaName]
      );

      if (schemaCheck.rowCount === 0) {
         console.log(`Schema '${schemaName}' not found in database`);

         // List available schemas for debugging
         const availableSchemas = await client.query(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'"
         );
         console.log('Available schemas:', availableSchemas.rows.map(row => row.schema_name));

         return NextResponse.json(
            {
               success: false,
               message: `Company schema '${schemaName}' not found`,
               error: 'SCHEMA_NOT_FOUND'
            },
            { status: 404 }
         );
      }

      // Check if items table exists in the schema and fetch items in one query
      console.log(`Fetching items from '${schemaName}.items'`);
      const itemsQuery = await client.query(`
         SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = 'items'
         ) as table_exists;
      `, [schemaName]);

      if (!itemsQuery.rows[0].table_exists) {
         console.log(`Items table not found in schema '${schemaName}'`);
         return NextResponse.json(
            {
               success: false,
               message: `Items table not found in company schema '${schemaName}'`,
               error: 'TABLE_NOT_FOUND'
            },
            { status: 404 }
         );
      }

      // Fetch the actual items
      const result = await client.query(
         `SELECT * FROM "${schemaName}".items ORDER BY createdat DESC`
      );

      console.log(`Found ${result.rowCount} items`);
      return NextResponse.json({
         success: true,
         items: result.rows,
      });
   } catch (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json(
         {
            success: false,
            message: 'Failed to fetch items',
            error: (error as Error).message,
            stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
         },
         { status: 500 }
      );
   } finally {
      if (client) client.release();
   }
}
