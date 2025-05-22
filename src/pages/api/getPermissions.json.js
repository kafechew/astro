export const GET = async ({request}) =>  {
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);

    // const id =  params.get("id") ; // Unused
    // const operation = params.get("operation"); // Unused
      
    // console.log(params.get("id")); // Permit.io related log removed
    // console.log(params.get("operation")); // Permit.io related log removed
    let response;

    try{
        // const permitted = await permit.check( String(id) , String(operation) , { // Permit.io check removed
        //     type: "Blog",
        //     tenant: "blog-tenant",
        //     });

        
        // if (permitted) { // Permit.io check removed
            
        response = {
            "status" : "permitted"
        }

        // } else { // Permit.io check removed
            
        //     response = {
        //         "status" : "not-permitted"
        //     }

        // }

        return new Response(JSON.stringify(response), {status :  200 })
        
        }catch(err){
        
        response = {
            "problem": "internal server error",
            "error" : err
        }

        return new Response(JSON.stringify(response), { status :  500 })
    }

  }