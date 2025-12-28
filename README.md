# The Leo assistant

251226 Recording and ability to take snapshots

251217 AI support and faster restarts


### Components needed
```
L298N motor controller

Raspberry pi3b with wifi or with wifi dongle

Raspberry pi camera module

Flying Fish IR obstacle avoidance sensors.


```


## **Updates sources and upgrade Raspberry Pi and removes no needed packages**
``` 
sudo apt update && sudo apt upgrade -y -f && sudo apt autoremove -y 
```
```
sudo apt install git build-essential rpicam-apps libcamera-apps python3-setuptools curl ffmpeg -y -f
```
### Clone pigpio source and install it
```
cd /tmp
git clone https://github.com/joan2937/pigpio.git
cd pigpio
make
sudo make install

```

### Make pigpiod to start at boot
```
sudo tee /etc/systemd/system/pigpiod.service > /dev/null << 'EOF'
[Unit]
Description=Pigpio daemon
After=network.target
Wants=network.target

[Service]
Type=forking
ExecStart=/usr/local/bin/pigpiod -p 8887
ExecStop=/usr/bin/killall pigpiod
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```
```
sudo systemctl daemon-reload
sudo systemctl enable pigpiod
sudo systemctl start pigpiod
sudo systemctl status pigpiod
```
```
sudo usermod -aG gpio $USER
```

### Prepare folders and get the code
``` 
sudo mkdir -p /opt/jarvis/
sudo chown -R $USER:$USER /opt/jarvis


sudo git clone https://github.com/anderssjoeberg75/leo_assistant.git /opt/jarvis/
``` 
### Set correct owner of the folder
I know chmod -R 777 gives all privileges but this is just under development
```
sudo chown $USER:$USER /opt/jarvis
sudo chmod -R 777 /opt/script/jarvis
```

### Install Node.JS v 20 LTS

``` 
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update -y
sudo apt install -y nodejs  
```
### Verify installation
``` 
node -v && npm -v
```
### Install all npm stuff needed
```
cd /opt/jarvis
sudo npm install
sudo npm install pigpio-client
``` 
### Make camera start streaming at boot
``` 
sudo tee /etc/systemd/system/leo-camera.service > /dev/null << 'EOF'
[Unit]
Description=Leo MJPEG Camera Stream
After=network.target
Wants=network.target

[Service]
Type=simple
User=netadmin
WorkingDirectory=/opt/jarvis
ExecStart=/usr/bin/node /opt/jarvis/camera_stream.js
Restart=always
RestartSec=2
Environment=NODE_ENV=production

TimeoutStopSec=5
KillMode=control-group

[Install]
WantedBy=multi-user.target
EOF
```
```
sudo systemctl daemon-reload
sudo systemctl enable leo-camera
sudo systemctl start leo-camera
sudo systemctl status leo-camera
```
### Make server start at boot
``` 
sudo tee /etc/systemd/system/leo-server.service > /dev/null << 'EOF'
[Unit]
Description=Leo server
After=network.target
Wants=network.target

[Service]
Type=simple
User=netadmin
WorkingDirectory=/opt/jarvis
ExecStart=/usr/bin/node /opt/jarvis/server.js
Restart=always
RestartSec=2
Environment=NODE_ENV=production

KillMode=control-group
TimeoutStopSec=5

[Install]
WantedBy=multi-user.target
EOF
```
```
sudo systemctl daemon-reload
sudo systemctl enable leo-server
sudo systemctl start leo-server
sudo systemctl status leo-server
```
Troubleshooting

```
journalctl -u leo-server -n 50 --no-pager
```
