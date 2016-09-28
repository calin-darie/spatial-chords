(function () {
  var cursorHeight = 15,
    closestElement, proposedCursor,
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
      var closestInCurrentWindow = getClosestFocusableInWindow(search),
        isUpdate = closestInCurrentWindow.element != null &&
          (typeof currentClosest === "undefined" || currentClosest === null ||
          typeof (currentClosest.distances) !== 'object' ||
          distanceLessThan(closestInCurrentWindow.distances, currentClosest.distances)),
        result = isUpdate
          ? closestInCurrentWindow
          : currentClosest;

      closestElement = closestInCurrentWindow.element;

      proposedCursorPosition = proposeCursorPosition(closestElement, search);

      proposedCursor = createCursor(
        proposedCursorPosition,
        search.direction
      );

      return {
        isUpdate: isUpdate,
        data: { distances: result.distances }
      };

      function proposeCursorPosition(proposedElement, search) {
        var proposedPosition,
          proposedElementRectangle;
        if (proposedElement == null) return null;
        switch (search.direction) {
          case "up":
          case "down":
            proposedElementRectangle = getRectangle(proposedElement);
            proposedPosition = {
              left: search.originRectangle.left,
              right: Math.max(search.originRectangle.right, proposedElementRectangle.right),
              top: proposedElementRectangle.top,
              bottom: proposedElementRectangle.bottom,
            };
            break;
          default:
            proposedPosition = getCursorPositionForElementAsOrigin(proposedElement);
            break;
        }
        return proposedPosition;
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
    console.log(' + creating cursor at ', cursor.getRectangle().top, cursor.getRectangle().left);
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
    if (cursor == null) return;

    windowMessaging.searchAll(
      {
        direction: direction,
        originRectangle: getAxis(direction) == getAxis(cursor.getDirection()) ?
          cursor.getRectangle() :
          getRectangle(document.activeElement)
      },
      'searchForClosest',
      function(match) {
        var newLineCriteria;
        if (typeof (match.data.distances) === 'object') {
          clearCursor();
          match.execute('focusClosest');
          return;
        }
      }
    );
  };

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
  };

  function setActive(e) {
    var cur = document.activeElement;
    unregisterCursorFocusEvents();
    if (cur) cur.blur();
    e.focus();
    registerCursorFocusEvents();
  };

  

  function getClosestFocusableInWindow(search) {
    var strategy = createStrategy(search);
    var focusableElements = getFocusableElements();
    var focusable,
      rectangle,
      i,
      distances,
      currentClosest = {
        element: null,
        distances: { primary: Infinity, secondary: Infinity }
      }, 
      activeElementRectangle = typeof(document.activeElement) === 'object'? 
        getRectangle(document.activeElement):
        {left:-1, top:-1, right:-1, bottom:-1};
    for (i = 0; i < focusableElements.length; i++) {
      focusable = focusableElements[i];
      rectangle = getRectangle(focusable);

      console.log(focusable, rectangle);
      
      if (rectanglesAreEqual(rectangle, activeElementRectangle) ||
        !strategy.isCandidate(rectangle)) {
        console.log('not a candidate'); 
        continue;
      }
      distances = strategy.distancesTo(rectangle);
      console.log('candidate: ', distances);
      if (distanceLessThan(distances, currentClosest.distances)) {
        currentClosest = {
          element: focusable,
          distances: distances
        };
      }
    }
    return currentClosest;
  };

  function getFocusableElements() {
    var focusableElements = document.querySelectorAll("a[href], area[href], input:not([type='hidden']), select, textarea, button, object, embed, *[tabindex]:not(iframe), *[contenteditable]");
    return enumerable
      .from(focusableElements)
      .where(isFocusable)
      .toArray();
  };

  function createStrategy(search) {
    switch (search.direction) {
      case 'left':
        return {
          distancesTo: function (rectangle) {
            return areOnSameRow(rectangle, search.originRectangle)? {
              primary: 0,
              secondary: search.originRectangle.right - rectangle.right
            } : {
              primary: Math.floor((search.originRectangle.top - rectangle.top) / cursorHeight + 1) * cursorHeight,
              secondary: -rectangle.right
            };
          },
          isCandidate: function(rectangle) {
            return areOnSameRow(rectangle, search.originRectangle)?
              rectangle.right <= search.originRectangle.right :
              isOnHigherRow(rectangle, search.originRectangle);
          }
        };
      case 'right':
        return {
          distancesTo: function(rectangle) {
            return areOnSameRow(rectangle, search.originRectangle) ? {
              primary: 0,
              secondary: rectangle.left - search.originRectangle.left
            } : {
              primary: Math.floor((rectangle.top - search.originRectangle.top) / cursorHeight + 1) * cursorHeight,
              secondary: rectangle.left
            };
          },
          isCandidate: function(rectangle) {
            return areOnSameRow(rectangle, search.originRectangle)? 
              rectangle.left >= search.originRectangle.left :
              isOnLowerRow(rectangle, search.originRectangle);
          }
        };
      case 'up':
        return {
          distancesTo: function (rectangle) {
            return areOnSameRow(rectangle, search.originRectangle) ?
              {
                primary: getHorizontalDeviation(rectangle, search.originRectangle.left),
                secondary: search.originRectangle.top - rectangle.top
              }
              :
              {
                primary: search.originRectangle.bottom - rectangle.bottom,
                secondary: getHorizontalDeviation(rectangle, search.originRectangle.left)
              };
          },
          isCandidate: function (rectangle) {
            return isOnHigherRow(rectangle, search.originRectangle)
              || (areOnSameRow(rectangle, search.originRectangle) && rectangle.top < search.originRectangle.top);
          }
        };
      case 'down':
        return {
          distancesTo: function (rectangle) {
            return areOnSameRow(rectangle, search.originRectangle) ?
              {
                primary: getHorizontalDeviation(rectangle, search.originRectangle.left),
                secondary: rectangle.top - search.originRectangle.top
              }
              :
              {
                primary: rectangle.top - search.originRectangle.top,
                secondary: getHorizontalDeviation(rectangle, search.originRectangle.left)
              };
          },
          isCandidate: function (rectangle) {
            return isOnLowerRow(rectangle, search.originRectangle)
              || (areOnSameRow(rectangle, search.originRectangle) && rectangle.top > search.originRectangle.top);
          }
        };
      default:
        throw new Error('unsupported direction');
    }

    function areOnSameRow(rectangle, otherRectangle) {
      return !(isOnHigherRow(rectangle, otherRectangle) || isOnLowerRow(rectangle, otherRectangle));
    }
    function isOnHigherRow(rectangle, otherRectangle) {
      return rectangle.bottom <= otherRectangle.top;
    }
    function isOnLowerRow(rectangle, otherRectangle) {
      return rectangle.top >= otherRectangle.bottom;
    }

    function getHorizontalDeviation(rectangle, axis) {
      if (rectangle.left <= axis && axis <= rectangle.right) return 0;
      return Math.min(Math.abs(rectangle.left - axis), Math.abs(rectangle.right - axis));
    };
  };

  function distanceLessThan(distance, otherDistances) {
    return distance.primary < otherDistances.primary ||
      (distance.primary == otherDistances.primary && distance.secondary < otherDistances.secondary);
  }

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
    element.classList.add(direction);
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
      element.style.height = (position.bottom - position.top + 1) + "px";
      element.style.width = (position.right - position.left + 1) + "px";
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