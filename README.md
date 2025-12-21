# jarvisassistant
Install and update all that is needed

Updates sources and upgrade Raspberry Pi and at the end removes no needed packages
``` 
sudo apt update && apt upgrade y -f && sudo apt autoremove -y 
```
``` 
sudo apt install -y  rpicam-apps libcamera0 v4l-utils pigpio ustreamer git -y -f
```
```
sudo usermod -aG gpio $USER
```

Prepare folders and get the code

Create folder for the webapp and the script folder
```
sudo mkdir -p /opt/jarvis
```
```
sudo mkdir -p /opt/script
```
Set correct owner of the folder
```
sudo chown $USER:$USER /opt/jarvis

```
Clone the repositopry
``` 
git clone https://github.com/anderssjoeberg75/jarvisassistant.git /opt/
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

reboot Raspberry pi
``` 
sudo reboot
```



reboot Raspberry pi
``` 
sudo reboot
```
