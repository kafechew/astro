import { Permit } from "permitio";

export const GET = async ({request}) =>  {
    
    
    const permit = new Permit({
        // your API Key
        token: import.meta.env.PERMIT_TOKEN,
        pdp: "https://cloudpdp.api.permit.io",

    });
    
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);

    const id =  params.get("id") ;
    const operation = params.get("operation");
      
    console.log(id);
    console.log(operation);
    let response;

    try{

        const permitted = await permit.check( String(id) , String(operation) , {
            type: "Blog",
            tenant: "blog-tenant",
            });

        
        if (permitted) {
            
            response = {
                "status" : "permitted"
            }

        } else {
            
            response = {
                "status" : "not-permitted"
            }

        }

        return new Response(JSON.stringify(response), {status :  200 })
        
        }catch(err){
        
        response = {
            "problem": "internal server error",
            "error" : err
        }

        return new Response(JSON.stringify(response), { status :  500 })
    }

  }