	/* eslint-disable sap-no-ui5base-prop */
	sap.ui.define([
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageBox"
	], function (JSONModel, MessageBox) {
		"use strict";
		return sap.ui.controller("com.sun.zpp_for_production.ext.controller.ListReportExt", {
			onInit: function (oEvent) {
				//GridTable Id
				if (!this._sIdPrefix) {
					this._sIdPrefix =
						"com.sun.zpp_for_production::sap.suite.ui.generic.template.ListReport.view.ListReport::GetMainListSet--GridTable";
				}
			},
			onAfterRendering: function (oEvent) {
				var oMessageManager;
				oMessageManager = sap.ui.getCore().getMessageManager();
				this.getView().setModel(oMessageManager.getMessageModel(), "message");
				oMessageManager.registerObject(this.getView(), true);
				this.i18nBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
				var oContentTable = this.byId(this._sIdPrefix);
				oContentTable.attachBusyStateChanged(this._onBusyStateChanged); //Contente Göre ColumnSize Ayarlanması
			},
			_onBusyStateChanged: function (oEvent) {
				var bBusy = oEvent.getParameter("busy");
				if (!bBusy && !this._bColumnOptimizationDone) {
					var oTable = oEvent.getSource();
					var oTpc = null;
					if (sap.ui.table.TablePointerExtension) {
						oTpc = new sap.ui.table.TablePointerExtension(oTable);
					} else {
						oTpc = new sap.ui.table.extensions.Pointer(oTable);
					}
					var aColumns = oTable.getColumns();
					for (var i = aColumns.length; i >= 0; i--) {
						oTpc.doAutoResizeColumn(i);
					}
				}
			},
			onBeforeRebindTableExtension: function (oEvent) {
				var oBindingParams = oEvent.getParameter("bindingParams");
				oBindingParams.parameters = oBindingParams.parameters || {};
			},
			getCustomAppStateDataExtension: function (oCustomAppData) {
				var oViewModel = new JSONModel({
					busy: false,
					delay: 0
				});
				this.getView().setModel(oViewModel, "modelView");
			},
			restoreCustomAppStateDataExtension: function (oCustomAppData) {
				/*
				if (oCustomAppData.SampleFilterFieldID !== undefined) {
					if ( this.oView.byId("SampleFilterFieldID") ) {
						this.oView.byId("SampleFilterFieldID").setSelectedKey(oCustomAppData.SampleFilterFieldID);
					}
				}
				*/
			},
			onPressEbeln: function (oEvent) {
				//Sipariş Fragmenti
				var oViewModel = this.getView().getModel("modelView");
				let oContext = oEvent.getSource().getBindingContext().getObject(),
					oModel = this.getView().getModel(),
					sSelectedOrderPath = oContext.Items.__list;
				var items = [];
				oContext.Items.__list.forEach(sPath => {
					let oDocument = oModel.getProperty("/" + sPath);
					items.push(oDocument);
				});
				oViewModel.setProperty("/OrderItems", items);
				if (!this._OrderItems) {
					this._OrderItems = sap.ui.xmlfragment("com.sun.zpp_for_production.fragment.OrderItems", this);
				}
				this.getView().addDependent(this._OrderItems);
				this._OrderItems.open();
			},
			onDialogCloseButton: function () {
				this._OrderItems.close();
			},
			_getMessagePopover: function () {
				if (!this._oMessagePopover) {
					this._oMessagePopover = sap.ui.xmlfragment(this.getView().getId(), "com.sun.zpp_for_production.fragment.MessagePopover", this);
					this.getView().addDependent(this._oMessagePopover);
				}
				return this._oMessagePopover;
			},
			onMessagePopoverPress: function (oEvent) {
				this._getMessagePopover().openBy(oEvent.getSource());
			},
			onClickActionGetMainListSet1: function (oEvent) {
				var that = this;
				var itemTable = [];
				var header = {};
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				var selectedItemsArr = this.extensionAPI.getSelectedContexts();
				if (!selectedItemsArr.length) {
					MessageBox.error(this.i18nBundle.getText("selectItem"));
					sap.ui.core.BusyIndicator.hide();
					return;
				}
				var KunnrTable = new Array();
				var VeranTable = new Array();
				var countveran = 0;
				var countkunnr = 0;
				for (var i = 0; i < selectedItemsArr.length; i++) {
					var selectedItems = selectedItemsArr[i].getObject();
					KunnrTable.push(selectedItems.Kunnr);
					VeranTable.push(selectedItems.Veran);
					delete selectedItems.__metadata;
					delete selectedItems.Asama;
					delete selectedItems.Gamng;
					delete selectedItems.Ktext;
					delete selectedItems.Kwmeng;
					delete selectedItems.NameOrg1;
					delete selectedItems.ZzasamaTnm;
					delete selectedItems.ZzduyuruNo;
					delete selectedItems.Items;
					delete selectedItems.Ebeln;
					delete selectedItems.AcikTsl;
					delete selectedItems.IcStok;
					delete selectedItems.Klmng;
					delete selectedItems.Maktx;
					delete selectedItems.MstStok;
					delete selectedItems.MtartTnm;
					delete selectedItems.Kunnr;
					delete selectedItems.Veran;
					selectedItems.KalanBakiye = String(selectedItems.KalanBakiye);
					itemTable.push(selectedItems);
				}
				//Aynı Üretici Kontrolü
				if (VeranTable.length !== 1) {
					var calcVeran = that.calcVeranValues(VeranTable);
					if (calcVeran !== 0) {
						MessageBox.error(this.i18nBundle.getText("differentVeran"));
						return;
					}
				}
				//Aynı Müşteri Kontrolü
				if (KunnrTable.length !== 1) {
					var calcVeran = that.calcKunnrValues(KunnrTable);
					if (calcVeran !== 0) {
						MessageBox.error(this.i18nBundle.getText("differentKunnr"));
						return;
					}
				}
				header.to_SaveItem = itemTable;
				sap.ui.core.BusyIndicator.show(0);
				this.getView().getModel().create("/SaveHeaderSet", header, {
					success: function (oData, response) {
						sap.ui.core.BusyIndicator.hide();
						sap.m.MessageToast.show("Başarılı");
						setTimeout(function () {
							that._getMessagePopover().openBy(that.getView().byId("ActionGetMainListSet1button"));
							that.getView().getModel().refresh(true);
						}, 2000);
					},
					error: function () {
						sap.ui.core.BusyIndicator.hide();
						setTimeout(function () {
							that._getMessagePopover().openBy(that.getView().byId("ActionGetMainListSet1button"));
						}, 100);
					}
				});
			},
			calcVeranValues: function (array) {
				var count = 0;
				var temp = array[0];
				for (var i = 0; i < array.length; i++) {
					if (temp !== array[i]) {
						count++;
					}
				}
				return count;
			},
			calcKunnrValues: function (array) {
				var count = 0;
				var temp = array[0];
				for (var i = 0; i < array.length; i++) {
					if (temp !== array[i]) {
						count++;
					}
				}
				return count;
			},
			onNavigateApp: function (oEvent) {
				var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
				var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
					target: {
						semanticObject: "ME2N",
						action: "display"
					},
					params: {
						"EBELN": oEvent.getSource().getTitle(),
						"LISTU": "ALV"
					}
				})) || "";
				// generate the Hash to display a Supplier
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: hash
					}
				});

			}
		});
	});