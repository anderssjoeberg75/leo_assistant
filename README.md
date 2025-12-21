# jarvisassistant

Prepare folders

Create folder for the webapp 
```
sudo mkdir -p /opt/jarvis
```

Set correct owner of the folder
```
sudo chown -R username:username /opt/jarvis
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
Install and update all that is needed

Updates sources and upgrade Raspberry Pi and at the end removes no needed packages
``` 
sudo apt update && apt upgrade y -f && sudo apt autoremove -y 
``` 
reboot Raspberry pi
``` 
sudo reboot
```
``` 
sudo apt install -y  rpicam-apps libcamera0 v4l-utils pigpio ustreamer git -y -f
```
sudo usermod -aG gpio $USER

reboot Raspberry pi
``` 
sudo reboot
```
