(function () {
  var closestElement,
    defaultAbsoluteOffset = {
      left: 0,
      top: 0
    },
    currentDocumentAbsoluteOffset = defaultAbsoluteOffset;
  
  document.addEventListener("keydown", handleKeyDown);

  windowMessaging.handlers.searchForClosest = {
    handle: function (search, context, currentClosest) {
      currentDocumentAbsoluteOffset = context.absolutePosition || defaultAbsoluteOffset;
      var closestInCurrentWindow = getClosestFocusableInCurrentWindow(search),
        isUpdate = typeof currentClosest === "undefined" ||
          currentClosest === null ||
          typeof (currentClosest.distance) !== 'number' ||
          closestInCurrentWindow.distance < currentClosest.distance,
        result = isUpdate
          ? closestInCurrentWindow
          : currentClosest;
      closestElement = closestInCurrentWindow.element;
      return {
        isUpdate: isUpdate,
        data: { distance: result.distance }
      };
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
      if (typeof closestElement !== 'object') return;
      setActive(closestElement);
    },
    getContext: function () {
      return {};
    }
  };


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

    function go(direction) {
      windowMessaging.searchAll(
        { direction: direction, activeRectangle: getRectangle(document.activeElement) },
        'searchForClosest',
        function (match) {
          match.execute('focusClosest');
        }
      );
    }
  };

  function setActive(e) {
    var cur = document.activeElement;
    if (cur) cur.blur();
    e.focus();
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
      if (rectanglesAreEqual(rectangle, search.activeRectangle) ||
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
          offset: search.activeRectangle.top,
          start: search.activeRectangle.left, end: search.activeRectangle.right
        };
        getSegmentToCompare = function(rectangle) {
          return {
            offset: rectangle.bottom,
            start: rectangle.left, end: rectangle.right
          };
        };
        isCandidate = function(rectangle) {
          return search.activeRectangle.top > rectangle.top;
        };
        break;
      case 'right':
        originSegment = {
          offset: search.activeRectangle.right,
          start: search.activeRectangle.top, end: search.activeRectangle.bottom
        };
        getSegmentToCompare = function (rectangle) {
          return {
            offset: rectangle.left,
            start: rectangle.top, end: rectangle.bottom
          };
        };
        isCandidate = function (rectangle) {
          return search.activeRectangle.left < rectangle.left;
        };
        break;
      case 'down':
        originSegment = {
          offset: search.activeRectangle.bottom,
          start: search.activeRectangle.left, end: search.activeRectangle.right
        };
        getSegmentToCompare = function (rectangle) {
          return {
            offset: rectangle.top,
            start: rectangle.left, end: rectangle.right
          };
        };
        isCandidate = function (rectangle) {
          return search.activeRectangle.top < rectangle.top;
        };
        break;
      case 'left':
        originSegment = {
          offset: search.activeRectangle.left,
          start: search.activeRectangle.top, end: search.activeRectangle.bottom
        };
        getSegmentToCompare = function (rectangle) {
          return {
            offset: rectangle.right,
            start: rectangle.top, end: rectangle.bottom
          };
        };
        isCandidate = function (rectangle) {
          return search.activeRectangle.left > rectangle.left;
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
      computedStyle = window.getComputedStyle(e),
      width = intval(computedStyle.getPropertyValue("width")),
      height = intval(computedStyle.getPropertyValue("height"));
    console.log("getRectangle ", computedStyle, width, height);
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
      && intval(computedStyle.getPropertyValue("width")) !== 0
      && intval(computedStyle.getPropertyValue("height")) !== 0
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

})();