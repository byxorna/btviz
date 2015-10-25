# btviz

Just playing around with different ways to visualize the progress of a BT swarm

```
$ docker-compose up
$ curl $(docker-machine ip dev):8080/graph.html
```

## TODO
* looks like reinitializing force atlas after killing it to get new node positions causes the browser to fuck up HARD. Figure this out...
* Stream in adds and removes
* make updating a model trigger the update in sigma
