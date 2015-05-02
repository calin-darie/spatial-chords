(function() {
  function doInCurrentTab(tabCallback) {
    chrome.tabs.query(
        { active: true },
        function (tabArray) { tabCallback(tabArray[0]); }
    );
  }
  var getDocumentAbsoluteOffset = function (tab, sendResponse) {
    chrome.tabs.sendMessage(tab.id, {
      operation: "getAbsoluteOffsetOfNestedDocument"
    }, sendResponse);
  };
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.operation) {
      case 'getDocumentAbsoluteOffset':
        doInCurrentTab(function (tab) {
          chrome.webNavigation.getAllFrames({ tabId: tab.id }, function(frame) {
             console.log(frame);
          });
        });
        //getDocumentAbsoluteOffset(sender.tab, sendResponse);
        break;
    }
  });
})();