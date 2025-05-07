import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
   try {
      const { email, password } = await request.json();

      // Input validation
      if (!email || !password) {
         return NextResponse.json(
            { success: false, message: 'Email and password are required' },
            { status: 400 }
         );
      }

      // Connect to the Neon database
      const sql = neon(`${process.env.DATABASE_URL}`);

      // Query the database for the user with schema specified
      const users = await sql`
         SELECT * FROM "Dashboard_Users".users 
         WHERE email = ${email}
      `;

      // Check if user exists
      if (users.length === 0) {
         return NextResponse.json(
            { success: false, message: 'User not found. Please register first.' },
            { status: 404 }
         );
      }

      // Check if password matches
      if (users[0].password !== password) {
         return NextResponse.json(
            { success: false, message: 'Invalid password' },
            { status: 401 }
         );
      }

      // Get company name from the user record
      const companyName = users[0].companyName;

      // Prepare user data
      const userData = {
         id: users[0].id,
         email: users[0].email,
         name: users[0].name,
         companyName: users[0].companyName,
         items: [] as Record<string, any>[]
      };

      // If company name exists, fetch items using the new API endpoint
      if (companyName) {
         try {
            // Create an absolute URL for the API call
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            const host = request.headers.get('host') || '';
            const baseUrl = `${protocol}://${host}`;

            // Call the new API to get items with absolute URL
            const itemsResponse = await fetch(`${baseUrl}/api/items/getItems?companyName=${encodeURIComponent(companyName)}`);

            if (itemsResponse.ok) {
               const itemsData = await itemsResponse.json();
               if (itemsData.success && itemsData.items) {
                  userData.items = itemsData.items;
               }
            } else {
               console.error('Failed to fetch items from API');
            }
         } catch (error) {
            console.error('Error fetching items:', error);
            // Continue with empty items array if there's an error
         }
      }

      // User authenticated successfully
      return NextResponse.json(
         {
            success: true,
            user: userData
         },
         { status: 200 }
      );
   } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
         { success: false, message: 'Authentication failed' },
         { status: 500 }
      );
   }
}

// We're keeping this function here in case it's used elsewhere in the application
async function checkSchemaExists(sql: any, schemaName: string): Promise<boolean> {
   try {
      const schemas = await sql`
         SELECT schema_name 
         FROM information_schema.schemata 
         WHERE schema_name = ${schemaName}
      `;
      return schemas.length > 0;
   } catch (error) {
      console.error('Error checking schema:', error);
      return false;
   }
}
