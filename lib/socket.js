const fs = require('fs-extra')

const server = require('https').createServer({
  key: fs.readFileSync(__dirname + '/cert/server.key'),
  cert: fs.readFileSync(__dirname + '/cert/server.crt')
}, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })
  res.write('slater running')
  res.end()
})

server.listen(3001)

module.exports = require('socket.io')(server, {
  serveClient: false
})
