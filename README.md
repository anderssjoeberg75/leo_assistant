# The Leo assistant
Components needed
L298N motor controller

Install and update all that is needed

Updates sources and upgrade Raspberry Pi and removes no needed packages
``` 
sudo apt update && sudo apt upgrade y -f && sudo apt autoremove -y 
```
```
sudo apt update
sudo apt install git build-essential rpicam-apps libcamera-apps python3-setuptools -y -f
```
Clone pigpio source and install it
```
cd /tmp
git clone https://github.com/joan2937/pigpio.git
cd pigpio
make
sudo make install

```

Make pigpiod to start at boot
```
sudo tee /etc/systemd/system/pigpiod.service > /dev/null << 'EOF'
[Unit]
Description=Pigpio daemon
After=network.target
Wants=network.target

[Service]
Type=forking
ExecStart=/usr/local/bin/pigpiod
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
```
```
sudo usermod -aG gpio $USER
```

Prepare folders and get the code

Clone the repositopry
``` 
sudo git clone https://github.com/anderssjoeberg75/leo_assistant.git /tmp/opt/
``` 
Set correct owner of the folder
```
sudo chown $USER:$USER /opt/jarvis

```
Clone the repositopry
``` 
git clone https://github.com/anderssjoeberg75/leo_assistant.git /opt/
cd /tmp/opt/
sudo cp -r * /opt/
``` 
Install Node.JS v 18.20.8

``` 
cd /tmp
wget https://unofficial-builds.nodejs.org/download/release/v18.20.8/node-v18.20.8-linux-armv6l.tar.xz
sudo cp -R node-v18.20.8-linux-armv6l/* /usr/local/
```
reboot Raspberry pi
``` 
sudo reboot
``` 
``` 
node -v && npm -v
```
Install all npm stuff needed 
```
cd /opt/jarvis
sudo npm install
sudo npm install pigpio-client
``` 
