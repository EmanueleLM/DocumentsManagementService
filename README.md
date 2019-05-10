# A Documents Management Service with Node.js, Docker and MongoDB

This is an example of how to build and deploy multiple Node.js services on Docker containers: the architecture is shown in Image 1.
<img src="" />
A simple Node.js server, 'batch server', written in pure javascript, keeps on pooling the updated version of a .json from another service, from now on 'external server', and stores the updates on a MongoDB database (let's call it simply 'database'). Those 3 services are deployed each on its own Docker container and communicate over a dedicated Docker network. No Containers Orchestrator is used (not even 'docker-compose', because sometimes you can't even use that). You may want to fork and extend this work with 'how to orchestrate with Kubernetes', 'how to deploy on GCP', 'how to deploy on OpenShift' etc.

This tutorial is intended both as a starting point and reference for troubleshooting with Node, Docker, Mongo etc. technologies.
Since the code has much more comments than usual production code, just read it and ask me anything (it's not that hard to find my email if you are reading this tutorial on github, otherwise this material has been stolen and you should call 911 (Should I tell you the number?)).

After the first part where I introduce the services implemented and the dependencies you need to satisfy, there are 2 main sections: 'Simple Tutorials' and 'Miscellanea'. The former is a series of 'how to' related to Docker, Mongo etc, while the latter is docker-composed (haha, don't you think this is funny?) by some tips that I learnt during the implementation of the whole stuff.

I've almost ready some other spin-offs of this tutorial, still I may need some hours of work to make them 'pretty': if I receive messages where I'm asked to do 'x' and 'x' is almost ready, I will add it to this page. The 'almost-pretty' extensions are:
- managing the containers with 'docker-compose' command
- managing the whole delivery-deployment process with 'Jenkins'


### Services Implemented so far 05/2019)
- batch server:
  - authentication with 'external server' (secrets + timestamp)
  - download of each single document that 'external server' exposes
- external server:
  - authentication with 'batch server' (secrets + timestamp)
  - exposure of APIs REST to download the .json with the documents' list, and each single document (given the document's id)
  - automatic update/clean of documents that are not up to date/not used anymore

Those modules have dependencies: to manage them, keep on reading.


### Node.js Dependencies (npm)
 - crypto ('npm install crypto');
 - cron ('npm install cron');
 - forever ('npm install forever');
 - express ('npm install express');
 - mongodb ('npm install mongodb').

When one or more dependencies are not satisfied, you can just enter the 'node_modules' folder and install them through the following command:
```
npm install <nome_package>
```

The package will be installed in 'node_modules' folder and will be available through the javascript command 'require('<nome_package>')'. You may want to use also the npm option '-g' (global): in that case, read the documentation.

### Section 1, Simple Tutorials
- <a href="#11-creare-un-container-docker-e-far-comunicare-sistema-batch-e-mockup-server-windowslinux-ubuntu">1.1 Create a Docker containers and make them communicate (Windows/Linux)</a>;
- <a href="#12-gestire-container-senza-docker-compose-linux-ubuntu">1.2 Manage containers (import/export) without orchestrator and/or docker-compose (Linux Ubuntu)</a>
- <a href="#13-deploy-dei-container-su-rete-privata-attenzione-binding-dellip-di-mongo-da-settare-su-un-unico-valore">1.3 Deploy on a dedicated Docker network</a>
- <a href="#14-container-con-servizi-in-massima-affidabilit%C3%A0-max-availability">1.4 Containers in 'max availability mode'</a> 

### Sezione 2, Miscellanea
- <a href="#21-comandi-utili-per-docker">2.1 Useful Docker commands (shell Windows/Linux)</a>;
- <a href="#22-comandi-mongo-linux-ubuntu">2.2 Useful Mongo commands (shell Linux)</a>
- <a href="#23-troubleshooting">2.3 Troubleshooting</a>.


## 1. Simple Tutorials 

### 1.1 Create a Docker containers and make them communicate (Windows/Linux)
Downlaod and install Docker for Windows and/or for Liunx: for the former, you can use the official link (e.g. on Windows 10 go here https://runnable.com/docker/install-docker-on-windows-10), while for Linux you can use your favourite package manager (e.g. on Ubuntu a 'apt-get install docker' is enough), or again install it from source.

Create a 'Dockerfile' (it is a plaintext) with no extension with this content:
```
FROM node:9

RUN mkdir -p /usr/src/external_server
WORKDIR /usr/src/external_server

COPY package.json /usr/src/external_server/
RUN npm install
COPY . /usr/src/external_server

# replace this with your application's default port
EXPOSE 3002

CMD [ "npm", "start"]
```

Save it in the 'external_server' folder. This file basically specifies which folders will be created when the container is initialized. Moreover, it will expose the services on the localhost at port 3002 (modify it with your favourite, not-already-in-use port).

Modify the 'package.json' file inside 'external_server' folder by adding the following line:
```  
"scripts": {
    "start": "node external_server.js"
  }
```

This will tell to node which file to execute to make the service start.

It's time to do mostly the same with the batch server, so let's create a 'Dockerfile' inside 'batch_server' folder:
```
FROM node:9

RUN mkdir -p /usr/src/batch_server
WORKDIR /usr/src/batch_server

COPY package.json /usr/src/batch_server/
RUN npm install
COPY . /usr/src/batch_server

# replace this with your application's default port
EXPOSE 3001

CMD [ "npm", "start" ]
```

This file basically specifies which folders will be created when the container is initialized. Moreover, it will expose the services on the localhost at port 3001 (modify it with your favourite, not-already-in-use port).

Modify the 'package.json' file inside 'batch_server' folder by adding the following line:
```  
"scripts": {
    "start": "node batch_server.js"
  }
```

Create the 'Dockerfile' for the database, inside the 'database' folder:
```  
FROM mongo

EXPOSE 27017

ENTRYPOINT ["/usr/bin/mongod"]
```

Our strategy is to use a persistent volume for Mongo that is managed directly by Docker: in this way all the difficulties related to data managment are overcome. In the following part I will show you how to do that, but now let's start the services.
Run docker (when you install it, after the rebbot it will start by default, but in case you have to find the .exe or the shellscript and run it).
Open 3 shells (just to make it easier, you can background stuff but I prefer to have every output within the reach of an alt-tab command).

Console 1: move into 'external_server' folder (cd command):
```
docker build -t external_server .
docker run -it --rm --name external_server -p 3002:3002 --network host external_server 
```

Console 1: move into 'batch_server' folder (cd command):
```
docker build -t batch_server .
docker run -it --rm --name batch_server -p 3001:3001 --network host batch_server 
```

Console 3: let's create a persistent volume, associate it with Mongo and start the service: before all, move into 'database' folder:
```
docker volume create mongodbdata
docker build -t mongodb .
docker run -it --rm --name mongodb -p 27017:27017 --network host -v mongodbdata:/data/db mongodb 
```

In order to create the images and run the container, read section 2.1.

Once you have started the 3 services, they communicate over the 'host' network. In the section 2.3 we will se how to make them communicate over a dedicated Docker network. After few seconds (depending on the cronjob inside 'batch_server.js') they will start communicating and writing on the db.

If everything goes well, you can check that at '127.0.0.1:<service_port>/' both batch and external server will reply to your HTTP GET (just use a browser to navigate to the localhost).


### 1.2 Manage containers (import/export) without orchestrator and/or docker-compose (Linux Ubuntu)
This section explains how to create Docker's images (they are exportable to any other system with Docker). 
Move into each directory that you want to 'dockerize', and launch the following commands:
```
docker build -t batch_server ./batch_server/
docker build -t mongodb ./database/
docker build -t external_server ./external_server/
```

If you want you can create .tar archives for each image.
```
sudo docker image save -o batch_server.tar batch_server:latest
sudo docker image save -o external_server.tar external_server:latest 
sudo docker image save -o mongo.tar mongodb:latest
```

If you want to export an image into your Docker's environment, untar each image into a folder (let's say 'export') and launch the command:
```
sudo docker load -i external_server.tar 
sudo docker load -i batch_server.tar 
sudo docker load -i mongo.tar 
```

Let's create the persistent volume for the db
```
docker volume create mongodbdata
```

Let's run the images
```
sudo docker run -it --rm --name mongodb -p 27017:27017 --network host -v mongodbdata:/data/db mongodb 
sudo docker run -it --rm --name external_server --network host external_server
sudo docker run -it --rm --name batch_server --network host batch_server
```


### 1.3 Deploy on a dedicated Docker network
- add the following line to mongo 'Dockerfile' if not present:
  ```
  CMD ["--bind_ip", "0.0.0.0"] 
  ```

- create a dedicated network:
  ```
  sudo docker network create mynet
  ```

- create the images and launch them on the private network
  ```
  sudo docker run -it --rm --name mongodb --network bridge -v mongodbdata:/data/db mongodb
  ```
  dove -v indica il volume persistente creato con 'docker creare volume mongodbdata'

- adding mongo to 'mynet' network:
  ```
  sudo docker network connect mynet mongodb --alias mongodb
  ```

  Obviously you can also run the container natively on the 'mynet' network.

  Please note that the '--alias' option specifies how the other containers can resolve the ip of this specific container just by using the name specified after '--alias' (it is actually the Docker DNS).

- you can launch the two other services in the same way:
  ```
  sudo docker run -it --rm --name external_server --network mynet  external_server
  ```

- lanciare il batch server con il seguente comando:
  ```
  sudo docker run -it --rm --name batch_server --network mynet  --link mongodb batch_server
  ```


### 1.4 Containers in 'max availability mode'
When a service faces an unexpected error, usually it terminates. If we want that the service restarts automatically, we need to use a dedicated service: one of the most used is 'forever'. In order to enable the feature, you have to install 'forever' with npm, and modify the 'package.json' file of the service you want to dockerize, by adding/modifying the section 'scripts' in the following way:
```
  "scripts": {
    "start": "forever --minUptime 5000 --spinSleepTime 3000 batch_server.js"
  }
```

We have specified that the batch server will be restarted after every 5 seconds if something bad occurs that terminates it. Pretty simple, uh?
You can use it with every service you want, even the database.

## Miscellanea

### 2.1 Useful Docker commands (shell Windows/Linux)
Open a shell, make sure Docker is running, and launch one of the following commands:

List of Docker images:
```
docker images
```

Check which images are running:
```
docker ps
```

List of containers created:
```
docker container ls
```

Stop a container:
```
docker stop CONTAINER_IMAGE
```

Stop all the running containers (Linux):
```
docker stop $(docker ps -q)
```

Delete an image of a container:
```
docker rmi CONTAINER_IMAGE
```

Eliminate all images (Linux):
```
docker rmi $(docker images -q)
```

Eliminate a container:
```
docker rm CONTAINER_CONTAINER
```

Eliminate all containers:
```
docker rm $(docker container ls -q)
```

Create a dedicated Docker network to make one or more containers communicate:
```
docker network create NET_NAME
```

Show all netowork's interfaces:
```
docker network ls
```

Check internal ip of a container:
```
docker network inspect NET_NAME
```
And look for subfield 'ipv4_address' in the field 'containers'.

### 2.2 Useful Mongo commands (shell Linux)
If you are running a MongoDB database inside one of your containers, you may want to check the status of the data from outside the Docker environment: in order to do so, you need to install MongoDB on your computer, run it and connect it to the service that is exposed by your container. These operations (install, connect, check) have been tested on Linux, I think it's doable also on Windows, but I wasn't able to test it.

Connecting to MongoDB (<mongo_container_ip> is the ip of the MongoDB container (check section 2.1 to know the value), while <mongo_container_port> is the default port, usually it is 27017, but you can check the 'Dockerfile'):
```
mongo <mongo_container_ip>:<mongo_container_port>
```

Selecting a db:
```
use <database_name>
```

Show all the available collections from a db (so after 'use db' command):
```
show collections
```

Show collection's content:
```
db.COLLECTION_NAME.find();
```

Insert an element into a collection:
```
db.COLLECTION_NAME.insert({json_field_1: value, json_field_2: value, ..});
```

Remove an object from a collection:
```
db.COLLECTION_NAME.remove({json_field_to_remove: value});
```

### 2.3 Troubleshooting
tbd