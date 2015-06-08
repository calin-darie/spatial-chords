windowMessaging = (function () {
  var id = generateGuid();
  var broadcasts = {
    searchAllWindows: createBroadcast("searchAllWindows", letExternalHandlerUpdateResult),
    findByPath: createBroadcast("findByPath", updateResultIfPathMatches)
  };
  var blacklist = [];

  var createResult = (function () {
    var nullSearchResult = {
      data: {},
      path: "",
      isNotFound: function () {
        return this.path === "";
      }
    };

    return resultFactory;

    function resultFactory(data, path) {
      var result = Object.create(nullSearchResult);
      if (data) result.data = data;
      if (path) result.path = path;
      return result;
    }
  })();
  window.addEventListener("message", receiveMessage, false);
  return {
    searchAll: broadcasts.searchAllWindows.execute,
    handlers: {}
  };

  //http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function letExternalHandlerUpdateResult(search, handlerName, currentResult, context) {
    var result;
    var decision = windowMessaging.handlers[handlerName].handle(
      search,
      context.externallyProvidedContext,
      currentResult.data);
    result = currentResult.isNotFound() || decision.isUpdate
      ? createResult(decision.data, context.currentPath)
      : currentResult;

    return result;
  }

  function updateResultIfPathMatches(search, handlerName, currentResult, context) {
    if (context.currentPath === search) {
      windowMessaging.handlers[handlerName].handle();
    }
    return currentResult;
  }

  function receiveMessage(event) {
    var currentPath;
    var serializedCurrentResult;
    var result;
    var broadcast;
    if (event.data.isAcknowledge === true ||
        event.data.isResponse === true) return;
    if (!broadcasts.hasOwnProperty(event.data.broadcast)) return;


    event.source.postMessage({
      broadcast: event.data.broadcast,
      isAcknowledge: true
    }, "*");
    
    broadcast = broadcasts[event.data.broadcast];
    
    currentPath = event.data.context.callerPath + "/" + id;
    serializedCurrentResult = event.data.currentResult;
    result = createResult(serializedCurrentResult.data, serializedCurrentResult.path);

    result = broadcast.getUpdatedResult(
      event.data.search,
      event.data.handlerName,
      result,
      {
        currentPath: currentPath,
        externallyProvidedContext: event.data.context.externallyProvidedContext
      });

    broadcast.recurseSearch(
      event.data.search,
      event.data.handlerName,
      function (currentResult) {
        event.source.postMessage({
          currentResult: currentResult,
          broadcast: event.data.broadcast,
          isResponse: true
        }, "*");
      },
      getFrames(event.data.handlerName),
      currentPath,
      result);
  }

  function getFrames(handlerName) {
    return enumerable
        .from(document.querySelectorAll("iframe, frame"))
        .where(isNotBlacklisted)
        .select(function (f) { return {
            context: windowMessaging.handlers[handlerName].getContext(f),
            window: f.contentWindow,
            blacklist: function () { blacklist.push(f); }
          }; })
        .toArray();
  }

  function isNotBlacklisted(frame) {
    return blacklist.indexOf(frame) < 0;
  }

  function createBroadcast(broadcastName, getUpdatedResult) {
    return {
      execute: searchAll,
      getUpdatedResult: getUpdatedResult,
      recurseSearch: recurseSearch,
    };

    function searchAll(search, handlerName, onDone) {
      recurseSearch(search, handlerName, callBack,
        [{ window: window.top, context: {}}],
        "",
        createResult());
      function callBack(result) {
        if (typeof onDone === 'function') {
          onDone({
            data: result.data,
            execute: function (targetedMessageHandlerName) {
              broadcasts.findByPath.execute(
                result.path,
                targetedMessageHandlerName);
            }
          });
        }
      }
    }

    function recurseSearch(search, handlerName, onDone, frames, currentPath, currentResult) {
      forEachAsync(frames, post, function() {
        onDone(currentResult);
      });

      function post(destinationFrame, continueForeachAsync) {
        var destinationWindow = destinationFrame.window;
        window.addEventListener("message", handleResponse);
        window.addEventListener("message", handleAcknowledge);
        var timeoutToken = setTimeout(handleTimeout, 50);

        destinationWindow.postMessage({
          broadcast: broadcastName,
          search: search,
          handlerName: handlerName,
          context: {
            callerPath: currentPath,
            externallyProvidedContext: destinationFrame.context
          },
          currentResult: currentResult
        }, "*");

        function handleTimeout() {
          window.removeEventListener("message", handleAcknowledge);
          window.removeEventListener("message", handleResponse);
          destinationFrame.blacklist();
          continueForeachAsync();
        }

        function handleAcknowledge(event) {
          if (event.data.broadcast === broadcastName &&
            event.data.isAcknowledge === true &&
            event.source === destinationWindow) {
            clearTimeout(timeoutToken);
            window.removeEventListener("message", handleAcknowledge);
          }
        }

        function handleResponse(event) {
          if (event.data.broadcast === broadcastName &&
            event.data.isResponse === true &&
            event.source === destinationWindow) {
            var serializedUpdatedResult = event.data.currentResult;
            currentResult = createResult(serializedUpdatedResult.data, serializedUpdatedResult.path);
            window.removeEventListener("message", handleResponse);
            continueForeachAsync();
          }
        }
      }
    }

    function forEachAsync(array, processCallback, doneCallback, currentIndex) {
      var continuation,
        isLastItem,
        lastItemIndex = array.length - 1;
      if (typeof currentIndex !== "number") {
        currentIndex = 0;
      }
      if (currentIndex > lastItemIndex) {
        doneCallback();
        return;
      }
      isLastItem = currentIndex == lastItemIndex;
      continuation = isLastItem
        ? doneCallback
        : function() { forEachAsync(array, processCallback, doneCallback, currentIndex + 1); };

      processCallback(array[currentIndex], continuation);
    }
  }
})();