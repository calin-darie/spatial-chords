using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium;
using System.Reflection;
using System.IO;
using System;
using System.Drawing;
using OpenQA.Selenium.Interactions;
using OpenQA.Selenium.Support.UI;

namespace SpatialChords.Tests
{
  [TestClass]
  public class BrowserTests
  {
    static private ChromeDriver _driver;
    [ClassInitialize]
    static public void Initialize(TestContext c)
    {
      var options = new ChromeOptions();
      var executingAssemblyFile = new Uri(Assembly.GetExecutingAssembly().CodeBase).AbsolutePath;
      var executingAssemblyFolder = Path.GetDirectoryName(executingAssemblyFile);
      var extensionPath = Path.Combine(executingAssemblyFolder,
          @"..\SpatialChords\SpatialChords.zip");
      options.AddExtension(extensionPath);
      _driver = new ChromeDriver(options);
    }

    [ClassCleanup]
    static public void Cleanup()
    {
      _driver.Dispose();
    }

    public class DirectionKey
    {
        public static DirectionKey Up = new DirectionKey("up", "i");
        public static DirectionKey Down = new DirectionKey("down", "k");
        public static DirectionKey Left = new DirectionKey("left", "j");
        public static DirectionKey Right = new DirectionKey("right", "l");

        public string Direction { get; private set; }
        public string Key { get; private set; }

        private DirectionKey(string direction, string key)
        {
            Direction = direction;
            Key = key;
        }
    }

    [TestMethod]
    public void GivenFocusedCentralElement_UpMovesFocusNorth_DownMovesFocusSouth_LeftMovesFocusWest_RightMovesFocusWest()
    {
      var testUrl = GetTestUrl("basic-navigation-cardinal-points.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("center");

      Press(DirectionKey.Up);
      Press(DirectionKey.Up);
      ExpectFocusMovesOn("north");
      Press(DirectionKey.Down);
      ExpectFocusMovesOn("center");

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("south");
      Press(DirectionKey.Up);
      ExpectFocusMovesOn("center");

      Press(DirectionKey.Left);
      ExpectFocusMovesOn("west");
      Press(DirectionKey.Right);
      ExpectFocusMovesOn("center");

      Press(DirectionKey.Right);
      ExpectFocusMovesOn("east");
      Press(DirectionKey.Left);
      ExpectFocusMovesOn("center");
    }

    [TestMethod]
    public void GivenCssNav_PressingDirectionKey_IgnoresSpatialChordsRulesAndFollowsCssNav()
    {
      Assert.Inconclusive("Not implemented yet");
      var testUrl = GetTestUrl("css-nav-cardinal-points.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("center");

      Press(DirectionKey.Up);
      ExpectFocusMovesOn("navnorth");
      Press(DirectionKey.Down);
      ExpectFocusMovesOn("center");

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("navsouth");
      Press(DirectionKey.Up);
      ExpectFocusMovesOn("center");

      Press(DirectionKey.Left);
      ExpectFocusMovesOn("navwest");
      Press(DirectionKey.Right);
      ExpectFocusMovesOn("center");

      Press(DirectionKey.Right);
      ExpectFocusMovesOn("naveast");
      Press(DirectionKey.Left);
      ExpectFocusMovesOn("center");
    }


    [TestMethod]
    public void GivenTopmostElementAboveFocusedElement_WhenUpPressedTwice_FocusStaysOnTopmost()
    {
      var testUrl = GetTestUrl("basic-navigation-cardinal-points.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("center");

      Press(DirectionKey.Up);
      ExpectFocusMovesOn("north");
      Press(DirectionKey.Up);
      ExpectFocusMovesOn("north");
    }

    [TestMethod]
    public void GivenFocusableAndNonFocusableElementsInAColumn_WhenMovingDown_NonFocusablesAreSkippedWhileFocusablesAreFocused()
    {
      var testUrl = GetTestUrl("detection-focusable-elements.html");
      _driver.Navigate().GoToUrl(testUrl);

      SetInitialFocus("start");

      for (var i = 1; i <= 17; i++)
      {
        if (i == 18) _driver.SwitchTo().Frame("nested");
        Press(DirectionKey.Down);
        string id = "focusable" + i;
        ExpectFocusMovesOn(id);
        //const string testDescription = "data-test-description";
        //todo: string expectedDescription = _driver.FindElement(By.Id(id)).GetAttribute(testDescription);
        //string actualDescription = currentElement.GetAttribute(testDescription);
      }
    }

    [TestMethod]
    public void GivenFocusableElementInAnotherFrame_WhenMovingTowardsIt_ItGetsFocus()
    {
      var testUrl = GetTestUrl("detection-inter-frame-top.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("topFocusable");
      
      Press(DirectionKey.Down);
      _driver.SwitchTo().Frame("nested");
      ExpectFocusMovesOn("nestedFocusable", 2000);

      Press(DirectionKey.Up);
      _driver.SwitchTo().ParentFrame();
      ExpectFocusMovesOn("topFocusable");
    }

    [TestMethod]
    public void GivenSandboxedFrameOnPage_NavigationOutsideSandboxStillWorks()
    {
      var testUrl = GetTestUrl("sandboxed-frame-container.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("startingPoint");

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("destination");
    }

    [TestMethod]
    public void GivenMultipleSandboxedFramesOnPageAndNoChange_PerformancePenaltyIsOnlyPayedOnce()
    {
      var testUrl = GetTestUrl("sandboxed-frame-container-performance.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("start");

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("firstStep", 999);

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("finish");
    }

    [TestMethod]
    public void Given3NonCollinearElements_WhenPerformingOpposingActions_IAlwaysEndUpWhereIStartedFrom ()
    {
      var testUrl = GetTestUrl("cursor-position-symmetry.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("west");

      Press(DirectionKey.Up);
      ExpectFocusMovesOn("north");
      Press(DirectionKey.Down);
      ExpectFocusMovesOn("west");
    }

    [TestMethod]
    public void GivenFocusedElement_ItGlows()
    {
      var testUrl = GetTestUrl("highlighting-focused-element.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("center");

      using (Bitmap image = GetPageScreenshot())
      {
        int highlightColor = image.GetPixel(2, 2).ToArgb();
        int backgroundColor = image.GetPixel(400, 400).ToArgb();
        Assert.AreNotEqual(backgroundColor, highlightColor);
      }
    }

    [TestMethod]
    public void WhenChangingMovementAxisThenTheFocusedElementBecomesTheNewOrigin()
    {
      var testUrl = GetTestUrl("changing-movement-axis.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("origin");

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("pivot");
      Press(DirectionKey.Right);
      ExpectFocusMovesOn("beyondPivot");
    }


    [TestMethod]
    public void WhenComputingOriginRectangleThenRectangleOfElementNearCursorIsTakenIntoAccount()
    {
      var testUrl = GetTestUrl("origin-rectangle-size.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("north-east");
      Press(DirectionKey.Left);
      ExpectFocusMovesOn("north-west");

      Press(DirectionKey.Right);
      ExpectFocusMovesOn("north-east");
    }

    [TestMethod]
    public void GivenOverlappedElementsThenNavigationGoesThroughAllOfThem()
    {
      var testUrl = GetTestUrl("overlapped-elements.html");
      _driver.Navigate().GoToUrl(testUrl);

      SetInitialFocus("hStart");
      Press(DirectionKey.Right);
      ExpectFocusMovesOn("hFirst");
      Press(DirectionKey.Right);
      ExpectFocusMovesOn("hSecond");
      Press(DirectionKey.Right);
      ExpectFocusMovesOn("hThird");
      
      SetInitialFocus("vStart");
      Press(DirectionKey.Down);
      ExpectFocusMovesOn("vFirst");
      Press(DirectionKey.Down);
      ExpectFocusMovesOn("vSecond");
      Press(DirectionKey.Down);
      ExpectFocusMovesOn("vThird");
    }

    [TestMethod]
    public void GivenElementsOverMultipleLinesThenCursorWrapsToBeginingOfNextLineOrEndOfPreviousLine()
    {
      var testUrl = GetTestUrl("cursor-moves-like-caret.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("start");
      for (var i = 1; i <= 9; i++)
      {
        Press(DirectionKey.Right);
        var expectedlinkId = string.Format("l{0:d2}", i);
        ExpectFocusMovesOn(expectedlinkId);
      }

      for (var i = 8; i >= 1; i--)
      {
        Press(DirectionKey.Left);
        var expectedlinkId = string.Format("l{0:d2}", i);
        ExpectFocusMovesOn(expectedlinkId);
      }

      Press(DirectionKey.Left);
      ExpectFocusMovesOn("start");
      Press(DirectionKey.Left);
      ExpectFocusMovesOn("start");
    }


    [TestMethod]
    public void GivenTwoElementsWithinVerticalCursorResolution_PressingDown_ElementsAreConsideredAtSameDistance()
    {
      //todo: force improved implementation
      var testUrl = GetTestUrl("bug-ignoring-cursor-resolution-when-moving-down.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("start");

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("nextRowDownClose");
    }

    private static Bitmap GetPageScreenshot()
    {
      Screenshot screenShot = ((ITakesScreenshot)_driver).GetScreenshot();
      var image = new Bitmap(new MemoryStream(screenShot.AsByteArray));
      return image;
    }

    private void SetInitialFocus(string initiallyFocusedId)
    {
        Console.WriteLine("Start on {0} element. Clicking on it...", initiallyFocusedId);
      IWebElement element = _driver.FindElement(By.Id(initiallyFocusedId));
      var actionsBuilder = new Actions(_driver);
      actionsBuilder.MoveToElement(element, 1, 1).Click().Perform();
      ExpectFocusMovesOn(initiallyFocusedId);
    }

    private string GetTestUrl(string fileName)
    {
      Console.WriteLine("Loading file {0}", fileName);
      return string.Format(@"file://{0}\{1}", Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), fileName);
    }

    private void ExpectFocusMovesOn(string elementId, int timeoutMilliseconds = 99)
    {
      var wait = new WebDriverWait(_driver, TimeSpan.FromMilliseconds(timeoutMilliseconds));
      string activeElementId = null;
      wait.Until(driver =>
      {
          activeElementId = GetActiveElementId();
          return activeElementId == elementId;
      });
      Console.WriteLine("Expecting focus to move on {0}", elementId);
      Assert.AreEqual(elementId, activeElementId);
    }

    private static string GetActiveElementId()
    {
      IWebElement currentElement = _driver.SwitchTo().ActiveElement();
      return currentElement.GetAttribute("id");
    }

    private void Press(DirectionKey directionKey)
    {
      Console.WriteLine("Going {0}...", directionKey.Direction);
      _driver.SwitchTo().ActiveElement().SendKeys(Keys.Alt + directionKey.Key);
    }
  }
}
