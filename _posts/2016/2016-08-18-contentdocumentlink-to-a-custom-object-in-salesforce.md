---
layout: post
title: ContentDocumentLink to a Custom Object in Salesforce
date: '2016-08-18 17:37'
bias: ContentDocumentLinkを作成する時の問題
tags:
  - Salesforce
  - Apex
  - Visualforce
---

Winter 16リリースでSalesforceはレコードにファイルを関連付ける「Salesforce Files」という新しい方法を導入しました。この新しい関連つける方法を通じて、より柔軟なファイル共有、改善された迅速なファイルプレビューなどが実現されました。詳細は[Salesforce Winter '16 リリースノート](https://releasenotes.docs.salesforce.com/ja-jp/winter16/release-notes/salesforce_release_notes.htm)を参照してください。

*この記事の中のコードは「[Salesforce: Convert Attachments to Chatter Files](https://douglascayers.wordpress.com/2015/10/10/salesforce-convert-attachments-to-chatter-files/)」(by Doug Ayers)を参考しました。*

---

下記はApexでContentDocumentを作成し、カスタムオブジェクトに紐つける例です。

```
ContentVersion cv = new ContentVersion();
cv.versionData = this.fileContent;
cv.title = this.fileName;
cv.pathOnClient = '/' + this.fileName;
insert cv;

cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];

ContentDocumentLink link = new ContentDocumentLink();
link.LinkedEntityId = this.ObjId;
link.ContentDocumentId = cv.ContentDocumentId;
link.ShareType = 'V';
insert link;
```

でも実際開発途中には、こういうエラーが出ました。

```
ドキュメント: 非公開ライブラリにあるドキュメントのリンクは作成できません
```

英語版だと、下記のようなメッセージ（日本語で資料探すのが困難な時、やはり英語でやった方が探しやすいです）：

```
document: you cannot create a link for a document in a private library
```

エラーメッセージがもう一つ出る可能性があります：

```
FIELD_INTEGRITY_EXCEPTION, You cannot create a link for this type of entity.
```

上記のエラーメッセージについて、質問が：

「非公開ライブラリ」とはいったいなんの関係なのか？詳細画面で関連リストに新規でファイルが添付できるのに、なぜApex classでできないの？コードに何か誤りがあるの？

最後は[SOAP API 開発者ガイド](https://developer.salesforce.com/docs/atlas.ja-jp.api.meta/api/sforce_api_objects_contentdocumentlink.htm)から答えを見つけました。
> API バージョン 33.0 以降では、フィードで追跡可能なレコードタイプの LinkedEntityId で ContentDocumentLink オブジェクトを作成および削除できます。

ここは大事なポイントだと思います。
実際、API バージョン を34.0にすれば、問題が解決しました。

新機能を活用する時、API バージョン をちゃんと注意しないとね。
