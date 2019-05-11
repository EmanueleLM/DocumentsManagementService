# A Documents Management Service with Node.js, Docker and MongoDB

TLDR: check this code if you want to build and deploy multiple Node.js services on Docker containers: the example architecture is shown in the next Image.

![GitHub Logo](/resources/images/architecture.png)

A simple Node.js server (from now on 'batch server'), written in javascript, keeps on asking for the updated version of a .json from another external service (from now on 'external server') hence stores the updated .json on a MongoDB database (I guess I can call it 'database'). Those 3 services are deployed each on its own Docker container and communicate over a dedicated Docker network. No orchestrator is used: not even 'docker-compose', because sometimes you can't even do that. 
You may want to fork and extend this work with 'how to orchestrate with Kubernetes', 'how to deploy on GCP', 'how to deploy on OpenShift' etc: drop me a message if you are interested.

This tutorial is intended both as a starting point and as a reference for troubleshooting with Node, Docker, Mongo etc. technologies.
The code is commented, so just read it and ask me anything: open an issue, or alternatively, it's not that hard to find my email if you are reading this tutorial on github (unless this material has been stolen and you should call 911 (Should I tell you the number?)).

In the first part I introduce the services implemented and the dependencies you need to satisfy to run them, while in the second a 'Simple Tutorials' section and 'Miscellanea' section are presented. The former is a series of 'how to' related to Docker, Mongo etc, while the latter is composed by some tips that I learnt during the implementation/integration of whole the stuff.

I've some other material ready for this tutorial, but I may need some hours of work to make it 'pretty-printable': if I receive messages where I'm asked to do 'x' and 'x' is almost ready, I will add it to this page. 
The 'almost-pretty' extensions are:
- managing the containers with 'docker-compose' command;
- managing the whole delivery-deployment process with 'Jenkins';
- managind the deploy on GCP or other clouds (like IBM Cloud or AWS) with some orchestrator like Kubernetes.


### Services Implemented so far 05/2019
- batch server:
  - authentication with 'external server' (double secret + timestamp)
  - download of each single document that 'external server' exposes
  - high availability
- external server:
  - authentication with 'batch server' (double secret + timestamp)
  - exposure of APIs REST to download the .json with the documents' list, and each single document (given the document's id)
  - automatic update/clean of documents that are not up to date/not used anymore
  - high availability
- database server:
  - persistent data
  - high availability

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

The package will be installed in 'node_modules' folder and will be available through the javascript command 'require('<nome_package>')'. You may want to use also the npm option '-g' (global): in that case, read the npm documentation.

### Section 1, Simple Tutorials
- <a href="#11-create-the-docker-containers-and-make-them-communicate-windowslinux">1.1 Create the Docker containers and make them communicate (Windows/Linux)</a>;
- <a href="#12-manage-containers-importexport-without-orchestrator-andor-docker-compose-linux">1.2 Manage containers (import/export) without orchestrator and/or docker-compose (Linux)</a>
- <a href="#13-deploy-on-a-dedicated-docker-network">1.3 Deploy on a dedicated Docker network</a>
- <a href="#14-containers-in-high-availability-mode">1.4 Containers in 'high availability mode'</a> 

### Sezione 2, Miscellanea
- <a href="#21-useful-docker-commands-shell-windowslinux">2.1 Useful Docker commands (shell Windows/Linux)</a>;
- <a href="#22-useful-mongo-commands-shell-linux">2.2 Useful Mongo commands (shell Linux)</a>
- <a href="#23-troubleshooting">2.3 Troubleshooting</a>.


## 1. Simple Tutorials 

### 1.1 Create the Docker containers and make them communicate (Windows/Linux)
Download and install Docker for Windows and/or for Liunx: for the former, you can use the official link (e.g. on Windows 10 go here https://runnable.com/docker/install-docker-on-windows-10), while for Linux you can use your favourite package manager (e.g. on Ubuntu a 'apt-get install docker' is enough), or again install it from source.

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


### 1.2 Manage containers (import/export) without orchestrator and/or docker-compose (Linux)
This section explains how to create Docker's images (they are exportable to any other system with Docker). 
Open a shell and move into each project directory that you want to 'dockerize', and launch the following commands:
```
docker build -t batch_server ./batch_server/
docker build -t mongodb ./database/
docker build -t external_server ./external_server/
```

If you want you can create .tar archives for each image.
```
 docker image save -o batch_server.tar batch_server:latest
 docker image save -o external_server.tar external_server:latest 
 docker image save -o mongo.tar mongodb:latest
```

If you want to export an image into your Docker's environment, untar each image into a folder (let's say '/export') and launch the commands:
```
 docker load -i external_server.tar 
 docker load -i batch_server.tar 
 docker load -i mongo.tar 
```

Let's create the persistent volume for the db
```
docker volume create mongodbdata
```

Let's run the images
```
 docker run -it --rm --name mongodb -p 27017:27017 --network host -v mongodbdata:/data/db mongodb 
 docker run -it --rm --name external_server --network host external_server
 docker run -it --rm --name batch_server --network host batch_server
```


### 1.3 Deploy on a dedicated Docker network
- add the following line to 'database' 'Dockerfile' if not present:
  ```
  CMD ["--bind_ip", "0.0.0.0"] 
  ```

- create a dedicated network:
  ```
   docker network create mynet
  ```

- create the images and launch them on the private network
  ```
   docker run -it --rm --name mongodb --network bridge -v mongodbdata:/data/db mongodb
  ```
  dove -v indica il volume persistente creato con 'docker creare volume mongodbdata'

- adding mongo to 'mynet' network:
  ```
   docker network connect mynet mongodb --alias mongodb
  ```

  Obviously you can also run the container natively on the 'mynet' network.

  Please note that the '--alias' option specifies how the other containers can resolve the ip of this specific container just by using the name specified after '--alias' (it is actually the Docker DNS).

- you can launch the two other services in the same way:
  ```
   docker run -it --rm --name external_server --network mynet  external_server
  ```

- lanciare il batch server con il seguente comando:
  ```
   docker run -it --rm --name batch_server --network mynet  --link mongodb batch_server
  ```


### 1.4 Containers in 'high availability mode'
When a node service faces an unexpected error (something you cannot handle with a try-catch), usually it terminates: if you are unlucky, yes, your server terminates. 
If you want the server restarts automatically, you need to use a dedicated service/daemon that restarts things that break up: one of the most used is 'forever' (there are many others, just google 'node.js restart automatically'). To enable the feature, you have to install 'forever' with npm, and modify the 'package.json' file of the service you want to dockerize, by adding/modifying the section 'scripts' with the following code:
```
  "scripts": {
    "start": "forever --minUptime 5000 --spinSleepTime 3000 batch_server.js"
  }
```

We have specified that the batch server will be restarted after every 5 seconds if something bad occurs that terminates it. Pretty simple, uh? 
You can use it with every service you want, even the database. 


## Miscellanea

### 2.1 Useful Docker commands (shell Windows/Linux)
Spawn a shell, make sure Docker is running, and launch one of the following commands:

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