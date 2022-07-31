# `host`

A nice way to host Braid apps.

Example usage:
```javascript
var host = require('@braidjs/host')

host.route({ path: '/pub*',  to: host.server('micropub') })
host.route({ path: '/*',     to: host.server('invisible.college') })

console.log('Making the host!')
host.listen(443)
```

This short-form example assumes you have web servers implemented at `./micropub/server.js` and `./invisible.college/server.js`, but you can also specify an arbitrary directory and script with:
```javascript
host.route({ path: <path>, to: host.server('directory', 'server.js') })
```
Or you can specify an existing server's port with:
```javascript
host.route({ path: <path>, to: {name: '<some name>', port: <port number>} })
```
