using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium;
using System.Reflection;
using System.IO;
using System.Threading;
using System;

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
      var executingAssemblyFile = new System.Uri(Assembly.GetExecutingAssembly().CodeBase).AbsolutePath;
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

    public static class DirectionKey
    {
      public static string Up = "i";
      public static string Down = "k";
      public static string Right = "l";
      public static string Left = "j";
    }

    [TestMethod]
    public void GivenFocusedCentralElement_UpMovesFocusNorth_DownMovesFocusSouth_LeftMovesFocusWest_RightMovesFocusWest()
    {
      var testUrl = GetTestUrl("basic-navigation-cardinal-points.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("center");

      Press(DirectionKey.Up);
      ExpectFocusMovesOn("north", "up");
      Press(DirectionKey.Down);
      ExpectFocusMovesOn("center", "down");

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("south", "down");
      Press(DirectionKey.Up);
      ExpectFocusMovesOn("center", "up");

      Press(DirectionKey.Left);
      ExpectFocusMovesOn("west", "left");
      Press(DirectionKey.Right);
      ExpectFocusMovesOn("center", "right");

      Press(DirectionKey.Right);
      ExpectFocusMovesOn("east", "right");
      Press(DirectionKey.Left);
      ExpectFocusMovesOn("center", "left");
    }


    [TestMethod]
    public void GivenTopmostElementAboveFocusedElement_WhenUpPressedTwice_FocusStaysOnTopmost()
    {
      var testUrl = GetTestUrl("basic-navigation-cardinal-points.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("center");

      Press(DirectionKey.Up);
      ExpectFocusMovesOn("north", "up");
      Press(DirectionKey.Up);
      ExpectFocusMovesOn("north", "up");
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
        const string testDescription = "data-test-description";
        Press(DirectionKey.Down);
        string id = "focusable" + i;
        IWebElement currentElement = _driver.SwitchTo().ActiveElement();
        string actualId = currentElement.GetAttribute("id");
        string expectedDescription = _driver.FindElement(By.Id(id)).GetAttribute(testDescription);
        string actualDescription = currentElement.GetAttribute(testDescription);
        Assert.AreEqual(id, actualId, string.Format("expected: {0}[{1}], actual:{2}[{3}]", 
          expectedDescription, id, 
          actualDescription, actualId));
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
      ExpectFocusMovesOn("nestedFocusable", "down");

      Press(DirectionKey.Up);
      _driver.SwitchTo().ParentFrame();
      ExpectFocusMovesOn("topFocusable", "up");
    }

    [TestMethod]
    public void GivenSandboxedFrameOnPage_NavigationOutsideSandboxStillWorks()
    {
      var testUrl = GetTestUrl("sandboxed-frame-container.html");
      _driver.Navigate().GoToUrl(testUrl);
      SetInitialFocus("startingPoint");

      Press(DirectionKey.Down);
      ExpectFocusMovesOn("destination", "down");
    }

    private void SetInitialFocus(string initiallyFocusedId)
    {
      IWebElement centralElement = _driver.FindElement(By.Id(initiallyFocusedId));
      centralElement.Click();
      ExpectFocusMovesOn(initiallyFocusedId, string.Format("clicked {0} element", initiallyFocusedId));
    }

    private string GetTestUrl(string fileName)
    {
      return string.Format(@"file://{0}\{1}", Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), fileName);
    }

    private void ExpectFocusMovesOn(string elementId, string message)
    {
      RetryAssertAreEqual(elementId, GetActiveElementId, message);
    }

    private void RetryAssertAreEqual(string expectedValue, Func<string> getActualValue, string message)
    {
      string actualValue = null;
      for (int triesLeft = 3; triesLeft > 0; triesLeft--)
      {
        actualValue = getActualValue();
        if (Equals(actualValue, expectedValue)) break;
        Thread.Sleep(250);
      }
      Assert.AreEqual(expectedValue, actualValue, message);
    }

    private static string GetActiveElementId()
    {
      IWebElement currentElement = _driver.SwitchTo().ActiveElement();
      return currentElement.GetAttribute("id");
    }

    private void Press(string directionKey)
    {
      _driver.SwitchTo().ActiveElement().SendKeys(Keys.Alt + directionKey);
    }
  }
}
