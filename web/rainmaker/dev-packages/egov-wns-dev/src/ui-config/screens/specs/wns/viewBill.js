import { getCommonHeader, getCommonCard, getCommonGrayCard, getCommonContainer, getCommonSubHeader, convertEpochToDate } from "egov-ui-framework/ui-config/screens/specs/utils";
// import get from "lodash/get";
import { getSearchResults, getSearchResultsForSewerage, fetchBill, getDescriptionFromMDMS, getConsumptionDetails } from "../../../../ui-utils/commons";
import set from "lodash/set";
import { getQueryArg } from "egov-ui-framework/ui-utils/commons";
import { prepareFinalObject } from "egov-ui-framework/ui-redux/screen-configuration/actions";
import { createEstimateData } from "../utils";
import { getFeesEstimateCard } from "../utils";
import { getProperty } from "./viewBillResource/propertyDetails";
import { getOwner } from "./viewBillResource/ownerDetails";
import { getService } from "./viewBillResource/serviceDetails";
import { viewBillFooter } from "./viewBillResource/viewBillFooter";
import { getTenantId, getUserInfo } from "egov-ui-kit/utils/localStorageUtils";

let consumerCode = getQueryArg(window.location.href, "connectionNumber");
const tenantId = getQueryArg(window.location.href, "tenantId")
const service = getQueryArg(window.location.href, "service")

const processBills = async (data, viewBillTooltip, dispatch) => {
  data.Bill[0].billDetails.forEach(bills => {
    let des, obj, groupBillDetails = [];
    bills.billAccountDetails.forEach(async element => {
      let cessKey = element.taxHeadCode
      let body;
      let tenantId = process.env.REACT_APP_NAME === "Citizen"?JSON.parse(getUserInfo()).permanentCity:getTenantId();
      if (service === "WATER") {
        body = { "MdmsCriteria": { "tenantId": tenantId, "moduleDetails": [{ "moduleName": "ws-services-calculation", "masterDetails": [{ "name": cessKey }] }] } }
      } else {
        body = { "MdmsCriteria": { "tenantId": tenantId, "moduleDetails": [{ "moduleName": "sw-services-calculation", "masterDetails": [{ "name": cessKey }] }] } }
      }
      let res = await getDescriptionFromMDMS(body, dispatch)
      if (res !== null && res !== undefined && res.MdmsRes !== undefined && res.MdmsRes !== null) {
        if (service === "WATER") { des = res.MdmsRes["ws-services-calculation"]; }
        else { des = res.MdmsRes["sw-services-calculation"]; }
        if (des !== null && des !== undefined && des[cessKey] !== undefined && des[cessKey][0] !== undefined && des[cessKey][0] !== null) {
          groupBillDetails.push({ key: cessKey, value: des[cessKey][0].description, amount: element.amount, order: element.order })
        } else {
          groupBillDetails.push({ key: cessKey, value: 'Please put some description in mdms for this Key', amount: element.amount, order: element.order })
        }
        if (groupBillDetails.length >= bills.billAccountDetails.length) {
          let arrayData = groupBillDetails.sort((a, b) => parseInt(a.order) - parseInt(b.order))
          obj = { bill: arrayData, fromPeriod: bills.fromPeriod, toPeriod: bills.toPeriod }
          viewBillTooltip.push(obj)
        }
        if (viewBillTooltip.length >= data.Bill[0].billDetails.length) {
          let dataArray = [{
            total: data.Bill[0].totalAmount,
            expiryDate: bills.expiryDate
          }]
          let sortedBills = viewBillTooltip.sort((a, b) => b.toPeriod - a.toPeriod);
          let currentDemand = sortedBills[0];
          sortedBills.shift();
          let totalArrears = 0;
          sortedBills.forEach(e => { e.bill.forEach(o => { totalArrears = totalArrears + o.amount }); })
          let finalArray = [{
            arrears: totalArrears,
            arrearsDescription: "Total outstanding payment of previous billing cycles.",
            description: currentDemand,
            data: dataArray
          }]
          dispatch(prepareFinalObject("viewBillToolipData", finalArray));
        }
      }
    })
  })
}

const searchResults = async (action, state, dispatch, consumerCode) => {
  let queryObjForSearch = [{ key: "tenantId", value: tenantId }, { key: "connectionNumber", value: consumerCode }]
  let queryObjectForConsumptionDetails = [{ key: "tenantId", value: tenantId }, { key: "connectionNos", value: consumerCode }]
  let viewBillTooltip = [], data;
  if (service === "WATER") {
    let meterReadingsData = await getConsumptionDetails(queryObjectForConsumptionDetails, dispatch);
    let payload = await getSearchResults(queryObjForSearch);
    let queryObjectForFetchBill = [{ key: "tenantId", value: tenantId }, { key: "consumerCode", value: consumerCode }, { key: "businessService", value: "WS" }];
    data = await fetchBill(queryObjectForFetchBill, dispatch);
    if (payload !== null && payload !== undefined && data !== null && data !== undefined) {
      if (payload.WaterConnection.length > 0 && data.Bill.length > 0) {
        let propTenantId = payloadData.WaterConnection[0].property.tenantId.split(".")[0];
        payload.WaterConnection[0].service = service
        await processBills(data, viewBillTooltip, dispatch);
        if (meterReadingsData !== null && meterReadingsData !== undefined && meterReadingsData.meterReadings.length > 0) {
          payload.WaterConnection[0].consumption = meterReadingsData.meterReadings[0].currentReading - meterReadingsData.meterReadings[0].lastReading
          payload.WaterConnection[0].currentMeterReading = meterReadingsData.meterReadings[0].currentReading
          payload.WaterConnection[0].lastMeterReading = meterReadingsData.meterReadings[0].lastReading
          meterReadingsData.meterReadings[0].currentReadingDate = convertEpochToDate(meterReadingsData.meterReadings[0].currentReadingDate)
          meterReadingsData.meterReadings[0].lastReading = meterReadingsData.meterReadings[0].lastReading === 0 ? "0" : meterReadingsData.meterReadings[0].lastReading
        }
        if (payload.WaterConnection[0].property.usageCategory !== null && payload.WaterConnection[0].property.usageCategory !== undefined) {
          const propertyUsageType = "[?(@.code  == " + JSON.stringify(payload.WaterConnection[0].property.usageCategory) + ")]"
          let propertyUsageTypeParams = { MdmsCriteria: { tenantId: propTenantId, moduleDetails: [{ moduleName: "PropertyTax", masterDetails: [{ name: "UsageCategoryMajor", filter: `${propertyUsageType}` }] }] } }
          const mdmsPropertyUsageType = await getDescriptionFromMDMS(propertyUsageTypeParams, dispatch)
          payload.WaterConnection[0].property.propertyUsageType = validatePropertyTaxName(mdmsPropertyUsageType);
        }
        dispatch(prepareFinalObject("WaterConnection[0]", payload.WaterConnection[0]));
        dispatch(prepareFinalObject("billData", data.Bill[0]));
        dispatch(prepareFinalObject("consumptionDetails[0]", meterReadingsData.meterReadings[0]))
      }
    }
  } else if (service === "SEWERAGE") {
    let queryObjectForFetchBill = [{ key: "tenantId", value: tenantId }, { key: "consumerCode", value: consumerCode }, { key: "businessService", value: "SW" }];
    let payload = await getSearchResultsForSewerage(queryObjForSearch, dispatch);
    data = await fetchBill(queryObjectForFetchBill, dispatch)
    let viewBillTooltip = []
    if (payload !== null && payload !== undefined && data !== null && data !== undefined) {
      if (payload.SewerageConnections.length > 0 && data.Bill.length > 0) {
        let propTenantId = payloadData.SewerageConnections[0].property.tenantId.split(".")[0];
        payload.SewerageConnections[0].service = service;
        await processBills(data, viewBillTooltip, dispatch);
        if (payload.SewerageConnections[0].property.usageCategory !== null && payload.SewerageConnections[0].property.usageCategory !== undefined) {
          const propertyUsageType = "[?(@.code  == " + JSON.stringify(payload.SewerageConnections[0].property.usageCategory) + ")]"
          let propertyUsageTypeParams = { MdmsCriteria: { tenantId: propTenantId, moduleDetails: [{ moduleName: "PropertyTax", masterDetails: [{ name: "UsageCategoryMajor", filter: `${propertyUsageType}` }] }] } }
          const mdmsPropertyUsageType = await getDescriptionFromMDMS(propertyUsageTypeParams, dispatch)
          payload.SewerageConnections[0].property.propertyUsageType = validatePropertyTaxName(mdmsPropertyUsageType);//propertyUsageType from Mdms
        }
        dispatch(prepareFinalObject("WaterConnection[0]", payload.SewerageConnections[0]));
        dispatch(prepareFinalObject("billData", data.Bill[0]));
      }
    }
  }
  createEstimateData(data, "screenConfiguration.preparedFinalObject.billData.billDetails", dispatch, {}, {});
};

const validatePropertyTaxName = (mdmsPropertyUsageType) => {
  if (
    mdmsPropertyUsageType !== undefined &&
    mdmsPropertyUsageType !== null &&
    mdmsPropertyUsageType.MdmsRes !== undefined &&
    mdmsPropertyUsageType.MdmsRes !== null &&
    mdmsPropertyUsageType.MdmsRes.PropertyTax !== undefined &&
    mdmsPropertyUsageType.MdmsRes.PropertyTax !== null &&
    mdmsPropertyUsageType.MdmsRes.PropertyTax.UsageCategoryMajor !== undefined &&
    mdmsPropertyUsageType.MdmsRes.PropertyTax.UsageCategoryMajor !== null &&
    mdmsPropertyUsageType.MdmsRes.PropertyTax.UsageCategoryMajor.length > 0
  ) { return mdmsPropertyUsageType.MdmsRes.PropertyTax.UsageCategoryMajor[0].name }
  else { return "NA" }
}

const beforeInitFn = async (action, state, dispatch, consumerCode) => {
  if (consumerCode) {
    await searchResults(action, state, dispatch, consumerCode);
  }
};

const billHeader = () => {
  if (service === "WATER") {
    return getCommonHeader({ labelKey: "WS_COMMON_WATER_BILL_HEADER" })
  } else if (service === "SEWERAGE") {
    return getCommonHeader({ labelKey: "WS_COMMON_SEWERAGE_BILL_HEADER" })
  }
}

let headerrow = getCommonContainer({
  header: billHeader(),
  consumerCode: {
    uiFramework: "custom-atoms-local",
    moduleName: "egov-wns",
    componentPath: "ConsumerNoContainer",
    props: { number: consumerCode }
  }
});

const estimate = getCommonGrayCard({
  header: getCommonSubHeader({ labelKey: "WS_VIEWBILL_DETAILS_HEADER" }),
  estimateSection: getFeesEstimateCard({ sourceJsonPath: "viewBillToolipData" }),
});

const propertyDetails = getProperty();
const ownerDetails = getOwner();
const serviceDetails = getService();

export const viewBill = getCommonCard({ estimate, serviceDetails, propertyDetails, ownerDetails });

const screenConfig = {
  uiFramework: "material-ui",
  name: "viewBill",
  beforeInitScreen: (action, state, dispatch) => {
    consumerCode = getQueryArg(window.location.href, "connectionNumber");
    // To set the application no. at the  top
    set(
      action.screenConfig,
      "components.div.children.headerDiv.children.header1.children.consumerCode.props.number",
      consumerCode
    );
    beforeInitFn(action, state, dispatch, consumerCode);
    return action;
  },

  components: {
    div: {
      uiFramework: "custom-atoms",
      componentPath: "Div",
      props: { className: "common-div-css search-preview" },
      children: {
        headerDiv: {
          uiFramework: "custom-atoms",
          componentPath: "Container",
          children: { header1: { gridDefination: { xs: 12, sm: 8 }, ...headerrow } }
        },
        viewBill,
        viewBillFooter
      }
    }
  }
};

export default screenConfig;