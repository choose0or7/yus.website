---
layout: "post"
title: "Open a link in Visualforce"
date: "2016-08-19 17:30"
bias: Visualforceの画面遷移について
tags:
  - Salesforce
  - Apex
  - Visualforce
  - Outputlink
---

### apex:Outputlinkで別ウィンドウを開く

#### targetを"\_blank"に指定 [^target]


値  |  説明
--|--
\_blank  |  常に名前無しのウィンドウを新規に開いて、そこに表示します。
\_self  |  自分自身のウィンドウ(フレーム)に表示します。
\_top  |  ウィンドウがフレームに分割されていれば、分割を全て解除して、そこに表示します。
\_parent  |  ウィンドウがフレームに分割されていれば、1段だけ分割を解除して、その親フレームに表示します。

```
<apex:outputLink value="{!sfInstance + '/'+ item.Id}" target="_blank">{!item.Title}</apex:outputLink>
```

#### JavaScriptを使う

```
<apex:outputLink onclick="window.open(URL,'','width=500,height=500')">Click here</apex:outputLink>
```


[^target]:target を指定する意味ーー[ターゲット指定](http://www.tohoho-web.com/html/attr/target.htm)
