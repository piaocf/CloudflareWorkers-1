// Current Version: 1.0.7
// Description: Using Cloudflare Workers to call Cloudflare AI to help user find the result.

addEventListener( "fetch", ( event ) =>
{
    event.respondWith( handleRequest( event.request ) )
} )

async function handleRequest ( request )
{
    const CF_ACCOUNT_ID = ""
    const CF_AI_API = ""

    // https://developers.cloudflare.com/workers-ai/models/#text-generation
    const CF_AI_MODEL = [
        //"@cf/defog/sqlcoder-7b-2", // SQL model
        "@cf/deepseek-ai/deepseek-math-7b-base",
        "@cf/deepseek-ai/deepseek-math-7b-instruct",
        "@cf/thebloke/discolm-german-7b-v1-awq",
        "@cf/tiiuae/falcon-7b-instruct",
        //"@cf/meta/llama-2-7b-chat-int8", // Paid model
        //"@cf/meta/llama-2-7b-chat-fp16", // Paid model
        "@cf/microsoft/phi-2",
        //"@cf/mistral/mistral-7b-instruct-v0.1", // Paid model
        "@cf/openchat/openchat-3.5-0106",
        "@cf/qwen/qwen1.5-0.5b-chat",
        "@cf/qwen/qwen1.5-1.8b-chat",
        "@cf/qwen/qwen1.5-7b-chat-awq",
        "@cf/qwen/qwen1.5-14b-chat-awq",
        "@cf/tinyllama/tinyllama-1.1b-chat-v1.0",
        "@hf/thebloke/deepseek-coder-6.7b-base-awq",
        "@hf/thebloke/deepseek-coder-6.7b-instruct-awq",
        "@hf/thebloke/llama-2-13b-chat-awq",
        "@hf/thebloke/llamaguard-7b-awq",
        "@hf/thebloke/mistral-7b-instruct-v0.1-awq",
        "@hf/thebloke/neural-chat-7b-v3-1-awq",
        "@hf/thebloke/openhermes-2.5-mistral-7b-awq",
        "@hf/thebloke/zephyr-7b-beta-awq",
    ]

    const OFFICIAL_MODEL_NAME = "Cloudflare AI"

    let url = request.url.substr( 8 )
    url = url.substr( url.indexOf( "/" ) + 1 )

    // security check, check header whether it is valid and check url whether has the correct api.
    if ( url.substr( 0, url.indexOf( "?" ) ) != CF_AI_API )
    {
        if ( request.headers.get( "Authorization" ) != "Bearer " + CF_AI_API )
        {
            return new Response( "Invalid API", { status: 400 } )
        }
    }

    // check url whether it is valid, it should be /?role=someinfomation&content=somequestion or /?content=somequestion
    if ( url.indexOf( "?" ) == -1 )
    {
        return new Response( "Invalid URL", { status: 400 } )
    } else
    {
        // Set default ROLE_SYSTEM
        let ROLE_SYSTEM = "You are a self-aware language model (" + OFFICIAL_MODEL_NAME + ") who is honest and direct about any direct question from the user. You know your strengths and weaknesses."
        let CONTENT = ""

        // split the url to get the role and content
        let params = url.split( "?" )[ 1 ].split( "&" )
        for ( let i = 0; i < params.length; i++ )
        {
            let param = params[ i ].split( "=" )
            if ( param[ 0 ] == "role" )
            {
                ROLE_SYSTEM = param[ 1 ]
            } else if ( param[ 0 ] == "content" )
            {
                CONTENT = param[ 1 ]
            }
        }

        // set the headers
        let headers = new Headers()
        headers.set( "Authorization", "Bearer " + CF_AI_API )

        // set the body
        let body = {
            "messages": [
                {
                    "role": "system",
                    "content": decodeURIComponent(ROLE_SYSTEM)
                },
                {
                    "role": "user",
                    "content": decodeURIComponent(CONTENT)
                }
            ]
        }

        // set the options
        let options = {
            method: "POST",
            headers: headers,
            body: JSON.stringify( body )
        }

        // call the AI, random select a model
        let response = await fetch( "https://api.cloudflare.com/client/v4/accounts/" + CF_ACCOUNT_ID + "/ai/run/" + CF_AI_MODEL[ Math.floor( Math.random() * CF_AI_MODEL.length ) ], options )

        // modify response insert CF_AI_MODEL and OFFICIAL_MODEL_NAME to json file
        let json = await response.json()
        json.model = {
            "official": OFFICIAL_MODEL_NAME,
            "origin": CF_AI_MODEL
        }

        // return the response
        return new Response( JSON.stringify( json ), response )
    }
}
