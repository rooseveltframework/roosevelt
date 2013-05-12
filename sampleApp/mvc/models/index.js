var model = function(req, res) {
  model.data = {
    content: {
      appTitle: 'roosevelt sample app',
      pageTitle: 'roosevelt sample app',
      hello: 'Hi! I\'m a variable trickling down through the MVC structure!',
      picLabel: 'Here\'s a silly picture of Teddy Rooseveldt:'
    },
    teddyPath: '/i/teddy.jpg'
  };
  
  app.emit('indexReady', res, model.data);
};

module.exports = model;