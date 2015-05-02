(function () {
  var absolutePosition,
    defaultAbsolutePosition = {
      left: 0,
      top: 0
    };
  windowMessaging.handlers.addOwnTitle = {
    handle: function(search, context, currentResult) {
      var currentTitleList = currentResult.titleList ? currentResult.titleList + "; " : "";
      absolutePosition = context.absolutePosition || defaultAbsolutePosition;
      return {
        isUpdate: true,
        data: {
          titleList: currentTitleList + document.title
        }
      };
    },
    getContext: function (frame) {
      return {
        absolutePosition: {
          left: absolutePosition.left + frame.offsetLeft,
          top: absolutePosition.left + frame.offsetTop
        }
      };
    }
  };

  windowMessaging.handlers.appendText = {
    handle: function () {
      console.log(absolutePosition);
      document.body.innerText += 'yabadabbadooooo ';
    },
    getContext: function() {
      return {};
    }
  };
})();