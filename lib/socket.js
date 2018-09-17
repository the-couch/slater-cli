const fs = require('fs-extra')

// const server = require('https').createServer({
//   key: fs.readFileSync(__dirname + '/cert/server.key'),
//   cert: fs.readFileSync(__dirname + '/cert/server.crt')
// })

const socket = require('socket.io')({
  serveClient: false
})

socket.listen(3000)

module.exports = {
  socket,
  closeServer () {
    server.close()
  }
}
