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

Install Node.JS

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
