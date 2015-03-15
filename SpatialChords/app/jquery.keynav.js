/*
 * jQuery Keyboard Navigation Plugin - Current
 *   http://mike-hostetler.com/jquery-keyboard-navigation-plugin
 *
 * To use, download this file to your server, save as keynav.js,
 * and add this HTML into the <head>...</head> of your web page:
 *   <script type="text/javascript" src="jquery.keynav.js"></script>
 *
 * Copyright (c) 2006-2010 Mike Hostetler <http://www.mike-hostetler.com/>
 * Licensed under the MIT License:
 *   http://www.opensource.org/licenses/mit-license.php
 */
(function ($) {
  var keynav = {};

  keynav.getFocusable = function (elements) {
    return elements.filter(function () {
      var computedStyle = window.getComputedStyle(this);
      return computedStyle.visibility === "visible"
        && computedStyle.display !== "none"
        && computedStyle.width !== 0 && computedStyle.height !== 0
        && this.disabled !== true;
    })
  };

  $.fn.keynav = function (onClass, offClass) {
    //Initialization
    if (!keynav.init) {
      keynav.el = new Array();

      $(document).on('keydown', function (e) {
        var isLeftAltTheOnlyModifierPressed = event.altKey && !event.ctrlKey && !event.shiftKey;
        if (!isLeftAltTheOnlyModifierPressed) return;
        console.log('keydown', e);
        switch (e.which) {
          case 73: // i
            keynav.goUp();
            break;
          case 74: // j
            keynav.goLeft();
            break;
          case 75: // k
            keynav.goDown();
            break;
          case 76: // l
            keynav.goRight();
            break;
        }
      });
      keynav.init = true;
    }
    keynav.el = this;
    return keynav.el.each(function () {
      keynav.reg(this);
    });
  };

  keynav.reg = function (e) {
    e.centerPosition = keynav.getPosition(e);
    keynav.el.push(e);
  };
  keynav.setActive = function (e) {
    var cur = keynav.getCurrent();
    if (cur) $(cur).trigger('blur');
    $(e).trigger('focus');
  };
  keynav.getCurrent = function () {
    return document.activeElement;
  };

  keynav.filter = function (cur, predicateOnRelativePosition) {
    var quad = Array(),
      focusable = keynav.getFocusable(keynav.el),
      focusableCount = focusable.length;

    for (i = 0; i < focusableCount; i++) {
      var el = focusable[i];
      if (cur == el) continue;
      if (predicateOnRelativePosition((cur.centerPosition.left - el.centerPosition.left), (cur.centerPosition.top - el.centerPosition.top)))
        quad.push(el);
    }
    return quad;
  };
  keynav.getClosest = function (focusedPointOfInterest, getCandidatePointsOfInterest, candidateElements) {
    var closest;
    var minDistance = undefined;
    var currentDistance;
    var found = false;
    var candidateElement;
    var candidatePointsOfInterest;
    var candidatePointOfInterest;
    var iCurrentCandidate, iCurrentPointOfInterest;
    for (iCurrentCandidate = 0; iCurrentCandidate < candidateElements.length; iCurrentCandidate++) {
      candidateElement = candidateElements[iCurrentCandidate];
      candidatePointsOfInterest = getCandidatePointsOfInterest(candidateElement);
      for (iCurrentPointOfInterest = 0; iCurrentPointOfInterest < candidatePointsOfInterest.length; iCurrentPointOfInterest++) {
        candidatePointOfInterest = candidatePointsOfInterest[iCurrentPointOfInterest];

        currentDistance = distanceBetween(focusedPointOfInterest, candidatePointOfInterest);

        console.log(minDistance, currentDistance);

        if (!found || currentDistance < minDistance) {
          closest = candidateElement;
          minDistance = currentDistance;
          found = true;
        }
      }
    }
    return closest;
  };

  keynav.activateClosest = function (isEligible) {
    var currentlyFocused = this.getCurrent();
    var candidateElements = this.filter(currentlyFocused, isEligible);
    this.setActive(this.getClosest(currentlyFocused.centerPosition, function (element) { return [{ left: element.centerPosition.left, top: element.centerPosition.top }] }, candidateElements));
  };


  function distanceBetween(positionA, positionB) {
    return Math.sqrt(Math.pow(positionA.left - positionB.left, 2) + Math.pow(positionA.top - positionB.top, 2));
  }

  keynav.goLeft = function () {
    keynav.activateClosest(function (dx, dy) {
      return (dx > 0);
    });
  };
  keynav.goRight = function () {
    keynav.activateClosest(function (dx, dy) {
      return (dx < 0);
    });
  };

  keynav.goUp = function () {
    keynav.activateClosest(function (dx, dy) {
      return (dy > 0);
    });
  };

  keynav.goDown = function () {
    keynav.activateClosest(function (dx, dy) {
      return (dy < 0);
    });
  };

  /**
   * This function was taken from Stefan's exellent interface plugin
   * http://www.eyecon.ro/interface/
   */
  var intval = function (v) {
    v = parseInt(v);
    return isNaN(v) ? 0 : v;
  };
  /**
   * This function was taken from Stefan's exellent interface plugin
   * http://www.eyecon.ro/interface/
   * 
   * I included it in this library's namespace because the functions aren't
   * quite the same.
   */
  keynav.getPosition = function (e) {
    var left = 0;
    var top = 0;
    var width = intval($.css(e, 'width'));
    var height = intval($.css(e, 'height'));
    while (e.offsetParent) {
      left += e.offsetLeft + (e.currentStyle ? intval(e.currentStyle.borderLeftWidth) : 0);
      top += e.offsetTop + (e.currentStyle ? intval(e.currentStyle.borderTopWidth) : 0);
      e = e.offsetParent;
    }
    left += e.offsetLeft + (e.currentStyle ? intval(e.currentStyle.borderLeftWidth) : 0);
    top += e.offsetTop + (e.currentStyle ? intval(e.currentStyle.borderTopWidth) : 0);
    return {
      left: left,
      top: top,
      right: left + width - 1,
      bottom: top + height - 1,
      centerLeft: Math.round(left + (width / 2)),
      centerTop: Math.round(top + (height / 2))
    };
  };
})(jQuery);