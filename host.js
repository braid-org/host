var servers = {}
var routes = []

var host = {}

host.route = ({path, to}) => { routes.push({path, to}) }

host.server = (name, file='server.js') => {
    var fork = require('child_process').fork
    var port = 2000 + Math.floor(Math.random() * 7999) + ''

    // Span a child process
    var process = fork(
        file,
        {                       // Options
            env: {port: port},
            cwd: name,
            stdio: 'pipe'
        }
    )
    var server = {process, output: '', port, name}
    servers[port] = server
    
    console.log('Spawned', name)//, 'to make', servers[port].stdout)

    process.stdout.on('data', (x) => {
        server.output += x
        console.log((`> ${name}: ` + x).slice(0, -1))
    })
    process.stderr.on('data', (x) => {
        server.output += x
        console.log((`> ${name}-err: ` + x).slice(0, -1))
    })
    process.on('close', (code) => {
        console.log('process', name, 'exited with code', code)
        delete servers[port]

        // Restart in 3 seconds
        setTimeout( () => module.exports.server(name, file), 3000)
    })
    return server
}

host.listen = (port) => {
    var http2 = require('http2')
    var read = require('fs').readFileSync
    var server = http2.createSecureServer({
        key: read('private-key'),
        cert: read('certificate'),
        allowHTTP1: true
    })
    var proxy = require('http2-proxy')

    server.on('request', (req, res) => {
        console.log('Host:', req.method, req.url, req.headers.accept && req.headers.accept.substr(0,40))

        for (var i=0; i<routes.length; i++) {
            var route = routes[i]

            //var new_req = {...req, path: '/foo'}
            // console.log('old/new request is', req, new_req)
            
            if (route_match(req, route)) {
                // if (route.path) {
                //     console.log('Changing url for', route.path,
                //                 'from', req.url, 'to',
                //                 '/' + req.url.substr(route.path.length))
                //     req.url = '/' + req.url.substr(route.path.length)
                // }
                console.log('Host: sending route to', route.to.name)
                proxy.web(req, res, {
                    hostname: 'localhost',
                    port: route.to.port
                }, errcatch)
                return
            }
        }

    })
    server.on('upgrade', (req, socket, head) => {
        console.log('Host websocket:', req.method, req.url)

        for (var i=0; i<routes.length; i++) {
            var route = routes[i]
            if (route_match(req, route)) {
                console.log('forwarding websocket to', route.to.name)
                proxy.ws(req, socket, head, {
                    hostname: 'localhost',
                    port: route.to.port
                }, errcatch)
                return
            }
        }
    })

    server.listen(port)
}

function route_match (req, route) {
    var regexify = (str) => typeof str === 'string'
        ? new RegExp('^' + str.replace('*', '.*'))
        : str
        

    // If host is specified, then make sure it matches
    if (route.host && req.headers.host
        && !req.headers.host.match(regexify(route.host)))
        return false

    // Now if path is specified, make sure it matches
    if (route.path
        && !req.url.match(regexify(route.path)))
        return false
    
    // Otherwise, we're good.
    return true
}

var errcatch = (err) => err && console.error('proxy error', err)


module.exports = host
