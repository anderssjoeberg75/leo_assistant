INSTALLATION:

1. Copy services:
   sudo cp service/*.service /etc/systemd/system/

2. Reload systemd:
   sudo systemctl daemon-reexec
   sudo systemctl daemon-reload

3. Enable services at boot:
   sudo systemctl enable jarvis.service
   sudo systemctl enable jarvis-camera.service

4. Start now:
   sudo systemctl start jarvis.service
   sudo systemctl start jarvis-camera.service

5. Check status:
   systemctl status jarvis.service
   systemctl status jarvis-camera.service
