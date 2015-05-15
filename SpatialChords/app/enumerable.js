(function() {
  window.enumerable = {
    from: function (array) {
      return {
        where: where.bind(array),
        select: select.bind(array),
        toArray: function () { return array; }
      }
    }
  };
  

  function select(selectorFunction) {
    var i,
      element,
      result = [];
    for (i = 0; i < this.length; ++i) {
      element = this[i];
      result[i] = selectorFunction(element);
    }
    return enumerable.from(result);
  }


  function where(predicate) {
    var quad = Array(), i;

    for (i = 0; i < this.length; i++) {
      var el = this[i];
      if (predicate(el))
        quad.push(el);
    }
    return enumerable.from(quad);
  };
})();