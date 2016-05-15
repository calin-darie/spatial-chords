(function () {
  var closestElement, proposedCursor,
    defaultAbsoluteOffset = {
      left: 0,
      top: 0
    },
    currentDocumentAbsoluteOffset = defaultAbsoluteOffset,
    cursor = null;

  if (window == window.top) {
    setCursor(createCursor());
  }
  
  document.addEventListener("keydown", handleKeyDown);

  windowMessaging.handlers.searchForClosest = {
    handle: function (search, context, currentClosest) {
      currentDocumentAbsoluteOffset = context.absolutePosition || defaultAbsoluteOffset;
      var closestInCurrentWindow = getClosestFocusableInCurrentWindow(search),
        isUpdate = closestInCurrentWindow.element != null &&
          (typeof currentClosest === "undefined" || currentClosest === null ||
          typeof (currentClosest.distance) !== 'number' ||
          closestInCurrentWindow.distance < currentClosest.distance),
        result = isUpdate
          ? closestInCurrentWindow
          : currentClosest;

        closestElement = closestInCurrentWindow.element;

        proposedCursor = createCursor(
          proposeCursorPosition(closestElement, search),
          search.direction
        );
      
        return {
          isUpdate: isUpdate,
          data: { distance: result.distance }
        };

        function proposeCursorPosition(proposedElement, search) {
          if (proposedElement == null) return null;
          var proposedElementRectangle = getRectangle(proposedElement);
          var result = {};
          switch (search.direction) {
            case 'down':
            case 'up': //remember row
              result.left = search.originRectangle.left;
              result.right = search.originRectangle.right;
              break;
            case 'right':
            case 'left': //remember column
              result.top = search.originRectangle.top;
              result.bottom = search.originRectangle.bottom;
              break;
          }
          switch (search.direction) { 
            case 'up':
              if (proposedElementRectangle.bottom < search.originRectangle.top) {
                result.top = proposedElementRectangle.top;
                result.bottom = proposedElementRectangle.bottom;
              } else {
                result.top = search.originRectangle.top;
                result.bottom = proposedElementRectangle.bottom;
              }
              break;
            case 'down':
              if (proposedElementRectangle.top > search.originRectangle.bottom) {
                result.top = proposedElementRectangle.top;
                result.bottom = proposedElementRectangle.bottom;
              } else {
                result.top = proposedElementRectangle.top;
                result.bottom = search.originRectangle.bottom;
              }
              break;
            case 'left':
              if (proposedElementRectangle.right < search.originRectangle.left) {
                result.left = proposedElementRectangle.left;
                result.right = proposedElementRectangle.right;
              } else {
                result.left = search.originRectangle.left;
                result.right = proposedElementRectangle.right;
              }
              break;
            case 'right':
              if (proposedElementRectangle.left > search.originRectangle.right) {
                result.left = proposedElementRectangle.left;
                result.right = proposedElementRectangle.right;
              } else {
                result.left = proposedElementRectangle.left;
                result.right = search.originRectangle.right;
              }
              break;
          }
          return result;
        }
    },
    getContext: function (frame) {
      var frameRectangle = getRectangle(frame);
      return {
        absolutePosition: {
          left: frameRectangle.left,
          top: frameRectangle.top
        }
      };
    }
  };

  windowMessaging.handlers.focusClosest = {
    handle: function () {
      if (typeof closestElement !== 'object' || closestElement === null) return;
      setCursor(proposedCursor);
      setActive(closestElement);
    },
    getContext: function () {
      return {};
    }
  };

  function setCursor(newCursor) {
    if (cursor != null) {
      cursor.dispose();
      unregisterCursorFocusEvents();
    }
    cursor = newCursor;
    registerCursorFocusEvents();
    newCursor.show();
  }

  function clearCursor() {
    if (cursor == null) return;
    cursor.dispose();
    unregisterCursorFocusEvents();
    cursor = null;
  }

  function registerCursorFocusEvents() {
    if (cursor != null) {
      document.addEventListener('focusout', cursor.dispose);
    }
    document.addEventListener('focusin', followFocusWithCursor);
  }

  function unregisterCursorFocusEvents() {
    if (cursor != null) {
      document.removeEventListener('focusout', cursor.dispose);
    }
    document.removeEventListener('focusin', followFocusWithCursor);
  }

  function followFocusWithCursor() {
    var newOrigin = getCursorPositionForElementAsOrigin(document.activeElement);
    setCursor(createCursor(newOrigin));
  }

  function getCursorPositionForElementAsOrigin(element) {
    return getRectangle(element);
  }

  function handleKeyDown(e) {
    var isLeftAltTheOnlyModifierPressed = event.altKey && !event.ctrlKey && !event.shiftKey;
    if (!isLeftAltTheOnlyModifierPressed) return;
    switch (e.which) {
      case keyCodeOf('I'):
        go('up');
        break;
      case keyCodeOf('J'):
        go('left');
        break;
      case keyCodeOf('K'):
        go('down');
        break;
      case keyCodeOf('L'):
        go('right');
        break;
    }
  };

  function go(direction) {
    if (cursor == null) return null;

    windowMessaging.searchAll(
      {
        direction: direction,
        originRectangle: getAxis(direction) == getAxis(cursor.getDirection()) ?
          cursor.getRectangle() :
          getRectangle(document.activeElement)
      },
      'searchForClosest',
      function (match) {
        if (typeof (match.data.distance) !== 'number') return;
        clearCursor();
        match.execute('focusClosest');
      }
    );
  }

  function getAxis(direction) {
    switch (direction) {
      case 'up':
      case 'down':
        return "vertical";
      case 'left':
      case 'right':
        return "horizontal";
      default:
        throw "invalid direction '" + direction + "'";
    }
  }

  function setActive(e) {
    var cur = document.activeElement;
    unregisterCursorFocusEvents();
    if (cur) cur.blur();
    e.focus();
    registerCursorFocusEvents();
  };

  function getClosestFocusableInCurrentWindow(search) {
    var strategy = createStrategy(search);
    var focusableElements = getFocusableElements();
    var focusable,
      rectangle,
      i,
      distance,
      currentClosest = {
        element: null,
        distance: Infinity
      };
    for (i = 0; i < focusableElements.length; i++) {
      focusable = focusableElements[i];
      rectangle = getRectangle(focusable);
      if (rectanglesAreEqual(rectangle, search.originRectangle) ||
        !strategy.isCandidate(rectangle)) continue;
      distance = strategy.distanceTo(rectangle);
      if (distance < currentClosest.distance) {
        currentClosest = {
          element: focusable,
          distance: distance
        };
      }
    }
    return currentClosest;
  };

  function getFocusableElements() {
    var focusableElements = document.querySelectorAll("a[href], area[href], input:not([type='hidden']), select, textarea, button, object, embed, *[tabindex], *[contenteditable]");
    return enumerable
      .from(focusableElements)
      .where(isFocusable)
      .toArray();
  };

  function createStrategy(search) {
    var originSegment, getSegmentToCompare, isCandidate;
    switch (search.direction) {
      case 'up':
        originSegment = {
          offset: search.originRectangle.top,
          start: search.originRectangle.left, end: search.originRectangle.right
        };
        getSegmentToCompare = function(rectangle) {
          return {
            offset: rectangle.bottom,
            start: rectangle.left, end: rectangle.right
          };
        };
        isCandidate = function(rectangle) {
          return search.originRectangle.top > rectangle.top;
        };
        break;
      case 'right':
        originSegment = {
          offset: search.originRectangle.right,
          start: search.originRectangle.top, end: search.originRectangle.bottom
        };
        getSegmentToCompare = function (rectangle) {
          return {
            offset: rectangle.left,
            start: rectangle.top, end: rectangle.bottom
          };
        };
        isCandidate = function (rectangle) {
          return search.originRectangle.left < rectangle.left;
        };
        break;
      case 'down':
        originSegment = {
          offset: search.originRectangle.bottom,
          start: search.originRectangle.left, end: search.originRectangle.right
        };
        getSegmentToCompare = function (rectangle) {
          return {
            offset: rectangle.top,
            start: rectangle.left, end: rectangle.right
          };
        };
        isCandidate = function (rectangle) {
          return search.originRectangle.top < rectangle.top;
        };
        break;
      case 'left':
        originSegment = {
          offset: search.originRectangle.left,
          start: search.originRectangle.top, end: search.originRectangle.bottom
        };
        getSegmentToCompare = function (rectangle) {
          return {
            offset: rectangle.right,
            start: rectangle.top, end: rectangle.bottom
          };
        };
        isCandidate = function (rectangle) {
          return search.originRectangle.left > rectangle.left;
        };
        break;
      default:
        throw new Error('unsupported direction');
    }

    return {
      distanceTo: function (rectangle) {
        var segmentToCompare = getSegmentToCompare(rectangle);
        var distance = distanceToOriginSegment(segmentToCompare);
        return distance;
      },
      isCandidate: isCandidate
    }

    function euclidianDistanceBetween(position1, position2) {
      return Math.sqrt(
        Math.pow(position1.left - position2.left, 2) +
        Math.pow(position1.top - position2.top, 2));
    }

    function distanceToOriginSegment(segment) {
      if (segment.end <= originSegment.start)
        return euclidianDistanceBetween(
          { top: segment.offset, left: segment.end },
          { top: originSegment.offset, left: originSegment.start }
        );
      else if (segment.start >= originSegment.end)
        return euclidianDistanceBetween(
          { top: segment.offset, left: segment.start },
          { top: originSegment.offset, left: originSegment.end }
        );
      else
        return Math.abs(segment.offset - originSegment.offset);
    }
  };

  function getRectangle(e) {
    var left = currentDocumentAbsoluteOffset.left,
      top = currentDocumentAbsoluteOffset.top,
      width = e.offsetWidth,
      height = e.offsetHeight;
    while (e) {
      left += e.offsetLeft + (e.currentStyle ? intval(e.currentStyle.borderLeftWidth) : 0);
      top += e.offsetTop + (e.currentStyle ? intval(e.currentStyle.borderTopWidth) : 0);
      e = e.offsetParent;
    }

    return {
      left: left,
      top: top,
      right: left + width - 1,
      bottom: top + height - 1,
      centerLeft: Math.round(left + (width / 2)),
      centerTop: Math.round(top + (height / 2))
    };
  };

  function intval(v) {
    v = parseInt(v);
    return isNaN(v) ? 0 : v;
  };

  function isFocusable(element) {
    var computedStyle = window.getComputedStyle(element);
    return computedStyle.getPropertyValue("visibility") === "visible"
      && computedStyle.getPropertyValue("display") !== "none"
      && element.offsetWidth !== 0
      && element.offsetHeight !== 0
      && element.disabled !== true;
  }

  function keyCodeOf(c) {
    return c.charCodeAt(0);
  }

  function rectanglesAreEqual(rectangle1, rectangle2) {
    return rectangle2.left === rectangle1.left &&
      rectangle2.right === rectangle1.right &&
      rectangle2.top === rectangle1.top &&
      rectangle2.bottom === rectangle1.bottom;
  }

  function createCursor(position, direction) {
    var element = document.createElement('span');
    var isDisposed = false;
    element.id = "spatial-chords-cursor";
    position = position || {};
    position.left = typeof (position.left) ==='number'? position.left : window.innerWidth / 4;
    position.top = typeof (position.top) === 'number'? position.top : 0;
    position.right = typeof (position.right) === 'number'? position.right : position.left;
    position.bottom = typeof (position.bottom) === 'number' ? position.bottom : position.top;
    direction = direction || "down";
    moveTo(position);
    return {
      getRectangle: getRectangle.bind(window, element),
      getDirection: function () { return direction; },
      show: function () { document.body.appendChild(element); },
      dispose: dispose
    }

    function moveTo(position) {
      element.style.position = "absolute";
      element.style.top = (position.top - currentDocumentAbsoluteOffset.top) + "px";
      element.style.left = (position.left - currentDocumentAbsoluteOffset.left) + "px";
      element.style.height = (position.bottom - position.top) + "px";
      element.style.width = (position.right - position.left) + "px";
    }
    function dispose() {
      if (isDisposed) return;
      isDisposed = true;
      if (element.parentElement != null)
        element.parentElement.removeChild(element);
      element = null;
    }
  }
})();