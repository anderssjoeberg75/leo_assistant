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

``` 
sudo reboot
```
``` 
node -v && npm -v
``` 
Install 

``` 
sudo apt update
sudo apt install -y libcamera-apps -y -f
``` 
reboot Raspfberry pi
``` 
sudo reboot
```
