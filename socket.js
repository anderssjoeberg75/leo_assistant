/*
  FILE: socket.js

  PURPOSE:
  - Share a single Socket.IO instance across modules
  - Allows controller.js to emit events to the UI
*/

let ioInstance = null;

module.exports = {
    setIO(io) {
        ioInstance = io;
    },

    get io() {
        if (!ioInstance) {
            throw new Error('Socket.IO not initialized');
        }
        return ioInstance;
    }
};
