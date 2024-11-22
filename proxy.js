// Current Version: 1.1.4
// Description: Using Cloudflare Workers to Reverse Proxy everything.

addEventListener( 'fetch', e => e.respondWith( fetchHandler( e ) ) )

async function fetchHandler ( e )
{
    try
    {
        const req = e.request
        const urlObj = new URL( req.url )
        const targetUrl = urlObj.searchParams.get( 'q' )
            ? `https://${ urlObj.host }/${ urlObj.searchParams.get( 'q' ) }`
            : urlObj.href.substring( urlObj.origin.length + 1 ).replace( /^https?:\/+/, 'https://' )

        const filteredHeaders = new Headers()
        req.headers.forEach( ( value, key ) =>
        {
            if ( !key.toLowerCase().startsWith( 'cf-' ) )
            {
                filteredHeaders.set( key, value )
            }
        } )

        const res = await fetch( targetUrl, {
            body: req.body,
            headers: filteredHeaders,
            method: req.method,
            redirect: 'manual'
        } )
        const resHdr = new Headers( res.headers )

        if ( resHdr.has( 'Location' ) )
        {
            return fetchHandler( {
                request: new Request( resHdr.get( 'Location' ), { ...req, redirect: 'manual' } )
            } )
        }

        resHdr.set( 'Access-Control-Allow-Headers', '*' )
        resHdr.set( 'Access-Control-Allow-Methods', '*' )
        resHdr.set( 'Access-Control-Allow-Origin', '*' )
        resHdr.set( 'Cache-Control', 'no-store' )

        if ( resHdr.get( "Content-Type" )?.includes( "text/html" ) )
        {
            const body = ( await res.text() ).replace(
                /((action|href|src)=["'])\/(?!\/)/g,
                `$1${ urlObj.protocol }//${ urlObj.host }/${ new URL( targetUrl ).origin }/`
            )
            return new Response( body, { headers: resHdr, status: res.status } )
        }

        return new Response( res.body, { headers: resHdr, status: res.status } )
    } catch ( error )
    {
        return new Response( JSON.stringify( { error: error.message } ), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        } )
    }
}
