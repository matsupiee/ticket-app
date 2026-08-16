import { test } from "../fixtures/app.fixture";

test.describe("1公演 / S席・A席の2券種 / 先着の1販売受付", () => {
  test("主催者がイベントを作成・公開し、ファンがイベントページから購入処理を完了でき、申込履歴とチケット一覧で情報を確認できる。", async ({
    app,
  }) => {
    // イベント名・会場名・券種名は seed シナリオ（1stage-2ticket-category-1sale-window）に合わせる
    const eventName = "1公演 2チケット種別 1受付";
    const stageName = "1公演 2チケット種別 1受付 公演";
    const venueName = "東京ドーム";
    const ticketCategoryS = { name: "S席", capacity: 20, price: 10000 };
    const ticketCategoryA = { name: "A席", capacity: 50, price: 5000 };

    await test.step("主催者としてログイン済み状態でイベント一覧を開く。", async () => {
      await app.organizer.eventList().goto();
      await app.organizer.eventList().expectVisible();
    });

    await test.step("イベント一覧から作成モードを選び、詳細イベント作成のウィザードへ進む。", async () => {
      await app.organizer.eventList().clickCreateEventButton();
      await app.organizer.eventCreationModePicker().selectDetailedMode();
    });

    await test.step("Step1: 基本情報にイベント名・説明を入力し、次へ進む。", async () => {
      await app.organizer.eventWizard().fillBasicInfo({ name: eventName, description: "" });
      await app.organizer.eventWizard().clickNext();
    });

    await test.step("Step2: 公演を1件追加し、会場・日程を入力する。", async () => {
      await app.organizer.eventWizard().addStage();
      await app.organizer.eventWizard().fillStage({
        name: stageName,
        venueName,
        // seed同様、現在日時から1週間後を公演日とする
        doorsOpenAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      });
      await app.organizer.eventWizard().clickNext();
    });

    await test.step("Step3: 席種としてS席・A席を追加し、公演ごとの在庫数を設定する。", async () => {
      await app.organizer.eventWizard().addSeatCategory();
      await app.organizer.eventWizard().fillSeatCategory({
        name: ticketCategoryS.name,
        stageName,
        capacity: ticketCategoryS.capacity,
      });
      await app.organizer.eventWizard().addSeatCategory();
      await app.organizer.eventWizard().fillSeatCategory({
        name: ticketCategoryA.name,
        stageName,
        capacity: ticketCategoryA.capacity,
      });
      await app.organizer.eventWizard().clickNext();
    });

    await test.step("Step4: 料金種別「通常」を追加し、S席・A席の標準価格を設定する。", async () => {
      await app.organizer.eventWizard().addRateType();
      await app.organizer.eventWizard().fillRateType({ name: "通常" });
      await app.organizer.eventWizard().fillStandardPrice({
        rateTypeName: "通常",
        seatCategoryName: ticketCategoryS.name,
        price: ticketCategoryS.price,
      });
      await app.organizer.eventWizard().fillStandardPrice({
        rateTypeName: "通常",
        seatCategoryName: ticketCategoryA.name,
        price: ticketCategoryA.price,
      });
      await app.organizer.eventWizard().clickNext();
    });

    await test.step("Step5: 先着の販売受付「一般販売」を追加し、S席・A席それぞれの券を登録する。", async () => {
      await app.organizer.eventWizard().addSaleWindow();
      await app.organizer.eventWizard().fillSaleWindow({
        name: "一般販売",
        saleMethod: "先着",
        applicationStartsAt: new Date(),
        applicationEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isSmsAuthRequired: false,
      });
      await app.organizer.eventWizard().addOffer({ saleWindowName: "一般販売" });
      await app.organizer.eventWizard().fillOffer({
        stageName,
        seatCategoryName: ticketCategoryS.name,
        rateTypeName: "通常",
      });
      await app.organizer.eventWizard().addOffer({ saleWindowName: "一般販売" });
      await app.organizer.eventWizard().fillOffer({
        stageName,
        seatCategoryName: ticketCategoryA.name,
        rateTypeName: "通常",
      });
    });

    await test.step("作成して公開し、公開完了を確認する。", async () => {
      await app.organizer.eventWizard().clickCreateAndPublish();
      await app.organizer.eventDetail().expectPublished();
    });

    await test.step("ファン側イベント一覧へ移動し、公開されたイベントが表示されることを確認する。", async () => {
      await app.fan.eventList().goto();
      await app.fan.eventList().expectEventVisible(eventName);
    });

    await test.step("購入者としてログインする。", async () => {
      await app.fan.signIn().goto();
      // seedのユーザー1相当のテストアカウントでログインする
      await app.fan.signIn().signIn({ email: "seed-fan-1-1stage2category@example.com" });
    });

    await test.step("イベント詳細ページを開き、公演・販売受付・S席/A席の残数が表示されることを確認する。", async () => {
      await app.fan.eventList().clickEvent(eventName);
      await app.fan.eventDetail().expectStageVisible(stageName);
      await app.fan.eventDetail().expectOfferVisible(ticketCategoryS.name);
      await app.fan.eventDetail().expectOfferVisible(ticketCategoryA.name);
    });

    await test.step("チケット申し込み画面へ進み、販売受付・公演・券種・枚数を選択する。", async () => {
      await app.fan.eventDetail().clickApplyButton();
      await app.fan.ticketApplication().selectSaleWindow("一般販売");
      await app.fan.ticketApplication().selectStage(stageName);
      await app.fan.ticketApplication().selectOffer(ticketCategoryS.name);
      await app.fan.ticketApplication().selectQuantity(2);
    });

    await test.step("小計・手数料・合計金額が表示されることを確認する。", async () => {
      await app.fan.ticketApplication().expectSubtotal(ticketCategoryS.price * 2);
      await app.fan.ticketApplication().expectTotalVisible();
    });

    await test.step("申し込み内容を確定し、申込完了ページを確認する。", async () => {
      await app.fan.ticketApplication().clickConfirm();
      await app.fan.applicationComplete().expectVisible();
    });

    await test.step("マイページの申込履歴に今回の申し込みが表示されることを確認する。", async () => {
      await app.fan.applicationComplete().clickGoToTickets();
      await app.fan.orderHistory().expectOrderVisible({
        eventName,
        offerName: ticketCategoryS.name,
        quantity: 2,
      });
    });

    await test.step("チケット一覧で、購入した2枚のS席チケット（整理番号付き）が確認できることを確認する。", async () => {
      await app.fan.ticketList().goto();
      await app.fan.ticketList().expectTicketVisible({
        eventName,
        stageName,
        offerName: ticketCategoryS.name,
      });
    });
  });
});
