# MVG iOS Widget based on Scriptable

This scriptable based iOS widget gives you the opportunity to have your most important MVG (Münchner Verkehrsgesellschaft) always available and up to date so that you can quickly check when the next Bus, UBahn, SBahn or Tram leaves.

The development is ongoing so drop me a note if you have ideas for future changes.

## 1 Features

1. Show next connections between two stations in MVG area
1. Show next departures for specific stations in MVG area

## 2. Disclaimer
After you have the main widget running it is automatically updating the real widget code every day if there are changes on the main branch in the Github Repository. This could be new functions or bug fixes. In the future I will also provide a main.js which does not update the widget.js code. You can chose that if you have security concerns.

## 3. How to use it

### 3.1 Preparation

The preparation step only needs to be done once. Afterwards the widget can be used multiple times.

1. Install the Scriptable app on your iPhone via the App Store. Link to Scriptable
   app: https://apps.apple.com/de/app/scriptable/id1405459188

1. Take your iPhone and go to:
   https://raw.githubusercontent.com/froehr/train-tracker/main/main.js

   This is the code for the widget to run on your phone.
   **Copy EVERYTHING from the first till the last line.**

1. Open the Scriptable app on your iPhone and tap the **+** Button in the top right corner to create
   a new script.

1. Paste the **COMPLETE** code from the link in step 2 into the editor and click done in the top
   left corner.

1. The new script should be available in the overview now and named _Untitled Script_. By clicking
   it a preview of the widget should be shown.

1. Rename the new script by long-clicking it and choosing _rename_. Name the script TrainTracker.

### 3.2 Deciding how you want to use the widget

There are three decisions you have to make:
1. Widget Size

2. Widget Content

3. Widget Station(s)

#### 3.2.1 Widget size
There are different widget sizes that work but not all functionality is available in all sizes due to size constraints.

| Widget Size | Available on | Single Connection | Double Connection | Single Departure | Double Departure | Four Departures | Line Messages |
| :---------- | :----------- | :---------------: | :---------------: | :--------------: | :--------------: | :-------------: | :-----------: |
| Small       | iPhone, iPad | ❌                | ❌                | ✅                | ❌               | ❌               | ❌            |
| Medium      | iPhone, iPad | ✅                | ❌                | ✅                | ✅               | ❌               | ❌            |
| Large       | iPhone, iPad | ✅                | coming soon       | ✅                | ✅               | ✅              | ❌            |
| Extra Large | iPad         | ✅                | coming soon       | ✅                | ✅               | ✅              | coming soon   |

#### 3.2.2 Widget Content
As already presented above there are different things a widget can show. These are the possibilities:

| Name          | Function Key  | Explanation                                                  | Implemented | 
|:------------- | :-----------  |:------------------------------------------------------------ | :---------: |
| Connection    | CONNECTION    | Showing the next connections between two defined stations.   | ✅          |
| Departure     | DEPARTURE     | Showing the next departures starting from a defined station. | ✅          |
| Line Messages | MESSAGE       | Showing messages related to as specific line.                | ❌          |

#### 3.2.3 Widget Stations
To specify a station to use it in this widget you need the global identifier that the MVG uses to tag their stations. To get the global identifier for your station follow these steps:

1. Go to https://www.mvg.de/api/fib/v2/location?query=SEARCH_PATTERN and replace SEARCH_PATTERN with the name of the station you are looking for.

1. You will receive a long list with results. Only those which have _type_ set to _STATION_. Easiest way is to search for those by `Crtl+F`. When you have found the station you are looking for copy the _globalId_.

1. Repeat this process for as many stations as you need for your widget setup.

#### 3.2.4 Transportation Types
It is possible to limit the types of transportation for departures and connections. If you don't specify anything all transportation types will be shown in the results. The possibilities to filter for are BAHN, UBAHN, TRAM, SBAHN, BUS and REGIONAL_BUS.

### 3.3 Preparing the configuration for the widget
The widget needs to know what it is supposted to be displaying. To define that you need to set a **parameter string** in its configuration. This step is explained in section 3.4. First we need to create this parameter string. The format of this string is JSON.

#### 3.3.1 Examples for parameter strings
1. Widget showing one connection
```json
{
   "functionKey": "CONNECTION",
   "connections" : [
      {
         "originId": "de:09162:1110",
         "destinationId": "de:09162:2",
         "transportationTypeFilter": "UBAHN,TRAM,SBAHN"
      }
   ]
}
```

2. Widget showing two connections
```json
{
   "functionKey": "CONNECTION",
   "connections" : [
      {
         "originId": "de:09162:1110",
         "destinationId": "de:09162:2",
         "transportationTypeFilter": "UBAHN,TRAM,SBAHN"
      },
      {
         "originId": "de:09162:2",
         "destinationId": "de:09162:1110"
      }
   ]
}
```

3. Widget showing the departures at a single station
```json
{
   "functionKey": "DEPARTURE",
   "departures": [
      {
         "originId": "de:09162:2",
         "transportationTypeFilter": "UBAHN,TRAM,SBAHN"
      }
   ]
}
```

4. Widget showing the departures at two stations
```json
{
   "functionKey": "DEPARTURE",
   "departures": [
      {
         "originId": "de:09162:1110",
         "transportationTypeFilter": "BAHN,UBAHN,TRAM,SBAHN,BUS,REGIONAL_BUS"
      },
      {
         "originId": "de:09162:2"
      }
   ]
}
```

5. Widget showing the departures at four stations
```json
{
   "functionKey": "DEPARTURE",
   "departures": [
      {
         "originId": "de:09162:1110",
         "transportationTypeFilter": "BAHN,UBAHN,TRAM,SBAHN,BUS,REGIONAL_BUS"
      },
      {
         "originId": "de:09162:2",
         "transportationTypeFilter": "BAHN,UBAHN,TRAM"
      },
      {
         "originId": "de:09162:13",
         "transportationTypeFilter": "BAHN,BUS,REGIONAL_BUS"
      },
      {
         "originId": "de:09162:524"
      }
   ]
}
```
### 3.4 Adding the widget to the iOS homescreen

After the preparation step and creating your parameter string the widget can be put onto the homescreen. You can even create multiple widgets with configurations of your choice.

1. Go back to your iPhone's homescreen to place the new widget on it.

1. Long press the homescreen (not an app) until the little **+** appears in the top left corner and
   all apps are wobbling around.

1. Tap the plus and chose **Scriptable** from the list. It will be somewhere close to the end of
   the alphabetical list.

1. Choose the widget size you like and that is supported for the function you have chosen and click **Add Widget**.

1. An empty widget has been placed on your homescreen now.

1. While it is still wobbling tap it and choose the script that should be executed. Choose the
   script TrainTracker that you've just created in the preparation phase.

1. Copy the parameter string that you prepared earlier and paste it into the _Parameter_ field.

1. Click Ready. Your MVG Widget should be ready to use now.

## 4. Feedback
If you have feedback of any kind or ideas for new features please open an issue and describe what you like to see. I would also appreciate feedback how it runs on your type of iPhone as I only have an iPhone 13 mini and can't test on other screen sizes.

![Sample image not found][logo]

[logo]: https://raw.githubusercontent.com/froehr/train-tracker/main/examples.png "Widget Example"