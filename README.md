# The Leo assistant
Components needed
L298N motor controller

Install and update all that is needed

Updates sources and upgrade Raspberry Pi and removes no needed packages
``` 
sudo apt update && sudo apt upgrade y -f && sudo apt autoremove -y 
```
``` 
sudo apt install -y  rpicam-apps libcamera-apps git -y -f
```
```
sudo usermod -aG gpio $USER
```

Prepare folders and get the code

Clone the repositopry
``` 
git clone https://github.com/anderssjoeberg75/leo_assistant.git /opt/
``` 
Set correct owner of the folder
```
sudo chown $USER:$USER /opt/jarvis

```
Clone the repositopry
``` 
git clone https://github.com/anderssjoeberg75/leo_assistant.git /opt/
``` 
reboot Raspberry pi
``` 
sudo reboot
```

Install Node.JS v 18.20.8

``` 
cd /tmp
wget https://unofficial-builds.nodejs.org/download/release/v18.20.8/node-v18.20.8-linux-armv6l.tar.xz
```
``` 
tar xvfJ node-v18.20.8-linux-armv6l.tar.xz
```
``` 
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
