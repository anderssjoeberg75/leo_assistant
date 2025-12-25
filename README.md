# The Leo assistant
Components needed
L298N motor controller

Install and update all that is needed

Updates sources and upgrade Raspberry Pi and removes no needed packages
``` 
sudo apt update && sudo apt upgrade -y -f && sudo apt autoremove -y 
```
```
sudo apt update
sudo apt install git build-essential rpicam-apps libcamera-apps python3-setuptools curl -y -f
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
``` 
sudo mkdir -p /opt/jarvis/
sudo chown -R $USER:$USER /opt/jarvis


sudo git clone https://github.com/anderssjoeberg75/leo_assistant.git /opt/jarvis/
``` 
Set correct owner of the folder
```
sudo chown $USER:$USER /opt/jarvis
```

Install Node.JS v 18.20.8

``` 
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt update -y
sudo apt install -y nodejs  
```
Verify installation
``` 
node -v && npm -v
```
Install all npm stuff needed 
```
cd /opt/jarvis
sudo npm install
sudo npm install pigpio-client
``` 
