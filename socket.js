/* ============================================================
   SOCKET.IO HANDLERS
   ============================================================ */

let currentSpeed = 50;
motor.setSpeed(currentSpeed);

io.on('connection', socket => {
    console.log('SOCKET CONNECTED:', socket.id);

    // Send current speed to GUI on connect
    socket.emit('speed:update', currentSpeed);

    socket.on('move', cmd => {
        switch (cmd) {
            case 'forward':  motor.forward();  break;
            case 'backward': motor.backward(); break;
            case 'left':     motor.left();     break;
            case 'right':    motor.right();    break;
        }
    });

    /* ================= SPEED COMMAND ================= */
    socket.on('speed', value => {
        currentSpeed = Number(value);
        motor.setSpeed(currentSpeed);

        // 🔑 THIS WAS MISSING / WRONG BEFORE
        io.emit('speed:update', currentSpeed);

        console.log('Speed set to', currentSpeed);
    });

    socket.on('stopAll', () => {
        motor.stopAll();
    });

    socket.on('disconnect', () => {
        motor.stopAll();
    });
});
