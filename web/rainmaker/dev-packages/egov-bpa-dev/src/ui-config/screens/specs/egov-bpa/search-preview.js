import {
  getCommonCard,
  getCommonContainer,
  getCommonHeader,
  getLabelWithValue,
  getCommonTitle,
  convertEpochToDate
} from "egov-ui-framework/ui-config/screens/specs/utils";
import {
  handleScreenConfigurationFieldChange as handleField,
  prepareFinalObject
} from "egov-ui-framework/ui-redux/screen-configuration/actions";
import {
  getFileUrlFromAPI,
  getFileUrl,
  getQueryArg,
  getTransformedLocale,
  setBusinessServiceDataToLocalStorage
} from "egov-ui-framework/ui-utils/commons";
import { getLocale } from "egov-ui-kit/utils/localStorageUtils";
import jp from "jsonpath";
import get from "lodash/get";
import set from "lodash/set";
import { getAppSearchResults } from "../../../../ui-utils/commons";
import { searchBill , requiredDocumentsData, setNocDocuments, getCurrentFinancialYear, edcrDetailsToBpaDetails } from "../utils/index";
import generatePdf from "../utils/generatePdfForBpa";
// import { loadPdfGenerationDataForBpa } from "../utils/receiptTransformerForBpa";
import { citizenFooter } from "./searchResource/citizenFooter";
import { applicantSummary } from "./summaryResource/applicantSummary";
import { basicSummary } from "./summaryResource/basicSummary"
import { previewSummary } from "./summaryResource/previewSummary";
import { declarationSummary } from "./summaryResource/declarationSummary";
import { scrutinySummary } from "./summaryResource/scrutinySummary";
import { estimateSummary } from "./summaryResource/estimateSummary";
import { fieldinspectionSummary } from "./summaryResource/fieldinspectionSummary";
import { httpRequest, edcrHttpRequest } from "../../../../ui-utils/api";
import { statusOfNocDetails } from "../egov-bpa/applyResource/updateNocDetails";
import { nocVerificationDetails } from "../egov-bpa/nocVerificationDetails";
import { permitConditions } from "../egov-bpa/summaryResource/permitConditions";
import { permitListSummary } from "../egov-bpa/summaryResource/permitListSummary";
import { permitOrderNoDownload, downloadFeeReceipt, revocationPdfDownload, setProposedBuildingData } from "../utils/index";
import "../egov-bpa/applyResource/index.css";
import "../egov-bpa/applyResource/index.scss";
import { getUserInfo, getTenantId } from "egov-ui-kit/utils/localStorageUtils";
import { fieldSummary } from "./summaryResource/fieldSummary";
import { fetchLocalizationLabel } from "egov-ui-kit/redux/app/actions";

export const ifUserRoleExists = role => {
  let userInfo = JSON.parse(getUserInfo());
  const roles = get(userInfo, "roles");
  const roleCodes = roles ? roles.map(role => role.code) : [];
  if (roleCodes.indexOf(role) > -1) {
    return true;
  } else return false;
};

const titlebar = {
  uiFramework: "custom-atoms",
  componentPath: "Div",
  children: {
    leftContainerH:getCommonContainer({
      header: getCommonHeader({
        labelName: "Application details",
        labelKey: "BPA_TASK_DETAILS_HEADER"
      }),
      applicationNumber: {
        uiFramework: "custom-atoms-local",
        moduleName: "egov-bpa",
        componentPath: "ApplicationNoContainer",
        props: {
          number: "NA"
        }
      }
    }),
    rightContainerH: getCommonContainer({
      footNote : {
        uiFramework: "custom-atoms-local",
        moduleName: "egov-bpa",
        componentPath: "NoteAtom",
        props: {
          number: "NA"
        },
        visible: false
      }
    })
  }
}

const titlebar2 = {
  uiFramework: "custom-atoms",
  componentPath: "Div",
  // visible: false,
  props: {
    style: { textAlign: "right", display: "flex" }
  },
  children: {
    permitNumber: {
      uiFramework: "custom-atoms-local",
      moduleName: "egov-bpa",
      componentPath: "PermitNumber",
      gridDefination: {},
      props: {
        number: "NA"
      },
    },
    rightContainer:getCommonContainer({
      downloadMenu: {
        uiFramework: "custom-molecules",
        componentPath: "DownloadPrintButton",
        props: {
          data: {
            label: {labelName : "DOWNLOAD" , labelKey :"BPA_DOWNLOAD"},
            leftIcon: "cloud_download",
            rightIcon: "arrow_drop_down",
            props: { variant: "outlined", style: { height: "60px", color : "#FE7A51", marginRight : 10 }, className: "tl-download-button" },
            menu: []
          }
        }
      },
      printMenu: {
        uiFramework: "custom-molecules",
        componentPath: "DownloadPrintButton",
        props: {
          data: {
            label: {labelName : "PRINT" , labelKey :"BPA_PRINT"},
            leftIcon: "print",
            rightIcon: "arrow_drop_down",
            props: { variant: "outlined", style: { height: "60px", color : "#FE7A51" }, className: "tl-download-button" },            
            menu: []
          }
        }
      }
    })
  }
}

const prepareDocumentsView = async (state, dispatch) => {
  let documentsPreview = [];

  // Get all documents from response
  let BPA = get(
    state,
    "screenConfiguration.preparedFinalObject.BPA",
    {}
  );
  let applicantDocuments = jp.query(
    BPA,
    "$.documents.*"
  );

  let otherDocuments = jp.query(
    BPA,
    "$.additionalDetail.documents.*"
  );
  let allDocuments = [
    ...applicantDocuments,
    ...otherDocuments
  ];

  allDocuments.forEach(doc => {

    documentsPreview.push({
      title: getTransformedLocale(doc.documentType),
      //title: doc.documentType,
      fileStoreId: doc.fileStore,
      linkText: "View"
    });
  });
  let fileStoreIds = jp.query(documentsPreview, "$.*.fileStoreId");
  let fileUrls =
    fileStoreIds.length > 0 ? await getFileUrlFromAPI(fileStoreIds) : {};
  documentsPreview = documentsPreview.map((doc, index) => {
    doc["link"] =
      (fileUrls &&
        fileUrls[doc.fileStoreId] &&
        getFileUrl(fileUrls[doc.fileStoreId])) ||
      "";
    doc["name"] =
      (fileUrls[doc.fileStoreId] &&
        decodeURIComponent(
          getFileUrl(fileUrls[doc.fileStoreId])
            .split("?")[0]
            .split("/")
            .pop()
            .slice(13)
        )) ||
      `Document - ${index + 1}`;
      return doc;
    
  });
  let documentDetailsPreview = [], nocDocumentsPreview = [];
  documentsPreview.forEach(doc => {
    if(doc && doc.title) {
      let type = doc.title.split("_")[0];
      if(type === "NOC") {
        nocDocumentsPreview.push(doc);
      }else {
        documentDetailsPreview.push(doc)
      }
    }
  })
  dispatch(prepareFinalObject("documentDetailsPreview", documentDetailsPreview));
  dispatch(prepareFinalObject("nocDocumentsPreview", nocDocumentsPreview));
};

// const prepareDocumentsUploadRedux = (state, dispatch) => {
//   dispatch(prepareFinalObject("documentsUploadRedux", documentsUploadRedux));
// };

const setDownloadMenu = (action, state, dispatch) => {
  /** MenuButton data based on status */
  let status = get(
    state,
    "screenConfiguration.preparedFinalObject.BPA.status"
  );
  let riskType = get(
    state,
    "screenConfiguration.preparedFinalObject.BPA.riskType"
  );
  let downloadMenu = [];
  let printMenu = [];
  let certificateDownloadObject = {
    label: { labelName: "Payment Receipt", labelKey: "BPA_APP_FEE_RECEIPT" },
    link: () => {
      downloadFeeReceipt(state, dispatch, status, "BPA.NC_APP_FEE");
    },
    leftIcon: "book"
  };
  let certificatePrintObject = {
    label: { labelName: "Payment Receipt", labelKey: "BPA_APP_FEE_RECEIPT" },
    link: () => {
      generatePdf(state, dispatch, "certificate_print");
    },
    leftIcon: "book"
  };
  let receiptDownloadObject = {
    label: { labelName: "Sanction Fee Receipt", labelKey: "BPA_SAN_FEE_RECEIPT" },
    link: () => {
      downloadFeeReceipt(state, dispatch, status, "BPA.NC_SAN_FEE");
    },
    leftIcon: "receipt"
  };
  let receiptPrintObject = {
    label: { labelName: "Sanction Fee Receipt", labelKey: "BPA_SAN_FEE_RECEIPT" },
    link: () => {
      generatePdf(state, dispatch, "receipt_print");
    },
    leftIcon: "receipt"
  };
  let applicationDownloadObject = {
    label: { labelName: "Permit Order Receipt", labelKey: "BPA_PERMIT_ORDER" },
    link: () => {
      permitOrderNoDownload(action, state, dispatch);
      // generatePdf(state, dispatch, "application_download");
    },
    leftIcon: "assignment"
  };
  let applicationPrintObject = {
    label: { labelName: "Permit Order Receipt", labelKey: "BPA_PERMIT_ORDER" },
    link: () => {
      generatePdf(state, dispatch, "application_print");
    },
    leftIcon: "assignment"
  };
  let paymentReceiptDownload = {
    label: { labelName: "Fee Receipt", labelKey: "BPA_FEE_RECEIPT" },
    link: () => {
      downloadFeeReceipt(state, dispatch, status, "BPA.LOW_RISK_PERMIT_FEE");
    },
    leftIcon: "book"
  };
  let revocationPdfDownlaod = {
    label: { labelName: "Revocation Letter", labelKey: "BPA_REVOCATION_PDF_LABEL" },
    link: () => {
      revocationPdfDownload(action, state, dispatch);
      // generatePdf(state, dispatch, "application_download");
    },
    leftIcon: "assignment"
  };

  if (riskType === "LOW") {
    switch (status) {
      case "REVOCATED":
        downloadMenu = [paymentReceiptDownload, revocationPdfDownlaod];
        break;
      case "APPROVED":
      case "DOC_VERIFICATION_INPROGRESS":
      case "FIELDINSPECTION_INPROGRESS":
      case "NOC_VERIFICATION_INPROGRESS":
      case "APPROVAL_INPROGRESS":
        downloadMenu = [paymentReceiptDownload, applicationDownloadObject];
        break;
      default:
        break;
    }
  } else {
    switch (status) {
      case "APPROVED":
        downloadMenu = [
          certificateDownloadObject,
          receiptDownloadObject,
          applicationDownloadObject
        ];
        printMenu = [];
        break;
      case "DOC_VERIFICATION_INPROGRESS" :
      downloadMenu = [certificateDownloadObject];
        break;
      case "FIELDINSPECTION_INPROGRESS" :
      downloadMenu = [certificateDownloadObject];
        break;
      case "NOC_VERIFICATION_INPROGRESS" :
      downloadMenu = [certificateDownloadObject];
        break;
      case "APPROVAL_INPROGRESS" : 
      downloadMenu = [certificateDownloadObject];
       break;
      case "PENDING_SANC_FEE_PAYMENT" :
      downloadMenu = [certificateDownloadObject];
      break;
      printMenu = [];
      case "DOCUMENTVERIFY":
      case "FIELDINSPECTION":
      case "PENDINGAPPROVAL":
      case "REJECTED":
        downloadMenu = [certificateDownloadObject];
        printMenu = [];
        break;
      case "CANCELLED":
      case "PENDINGPAYMENT":
        downloadMenu = [applicationDownloadObject];
        printMenu = [];
        break;
      default:
        break;
    }
  }
  dispatch(
    handleField(
      "search-preview",
      "components.div.children.headerDiv.children.header2.children.titlebar2.children.rightContainer.children.downloadMenu",
      "props.data.menu",
      downloadMenu
    )
  );
  dispatch(
    handleField(
      "search-preview",
      "components.div.children.headerDiv.children.header2.children.titlebar2.children.rightContainer.children.printMenu",
      "props.data.menu",
      printMenu
    )
  );
  /** END */
};

const getRequiredMdmsDetails = async (state, dispatch) => {
  let mdmsBody = {
    MdmsCriteria: {
      tenantId: getTenantId(),
      moduleDetails: [
        {
          moduleName: "common-masters",
          masterDetails: [
            {
              name: "DocumentType"
            }
          ]
        },
        {
          moduleName: "BPA",
          masterDetails: [
            {
              name: "DocTypeMapping"
            },
            {
              name: "CheckList"
            },
            {
              name: "RiskTypeComputation"
            }
          ]
        }
      ]
    }
  };
  let payload = await httpRequest(
      "post",
      "/egov-mdms-service/v1/_search",
      "_search",
      [],
      mdmsBody
    );
    dispatch(prepareFinalObject("applyScreenMdmsData", payload.MdmsRes));
}

const setSearchResponse = async (
  state,
  dispatch,
  applicationNumber,
  tenantId, action
) => {
  await getRequiredMdmsDetails(state, dispatch);
  const response = await getAppSearchResults([
    {
      key: "tenantId",
      value: tenantId
    },
    { key: "applicationNo", value: applicationNumber }
  ]);

  const edcrNumber = get(response, "Bpa[0].edcrNumber");
  const status = get(response, "Bpa[0].status");
  dispatch(prepareFinalObject("BPA", response.Bpa[0]));

  let edcrRes = await edcrHttpRequest(
    "post",
    "/edcr/rest/dcr/scrutinydetails?edcrNumber=" + edcrNumber + "&tenantId=" + tenantId,
    "search", []
    );

  dispatch( prepareFinalObject( `scrutinyDetails`, edcrRes.edcrDetail[0] ));

  await edcrDetailsToBpaDetails(state, dispatch);

  let riskType = get(
    state.screenConfiguration.preparedFinalObject,
    "BPA.riskType"
  );
  let businessServicesValue = "BPA";
  if (riskType === "LOW") {
    businessServicesValue = "BPA_LOW";
  }

  const queryObject = [
    { key: "tenantId", value: tenantId },
    { key: "businessServices", value: businessServicesValue }
  ];
  setBusinessServiceDataToLocalStorage(queryObject, dispatch);

  if (status && status == "INPROGRESS") {
    let userInfo = JSON.parse(getUserInfo()), roles = get(userInfo, "roles"), isArchitect = false;
    if (roles && roles.length > 0) {
      roles.forEach(role => {
        if (role.code === "BPA_ARCHITECT") {
          isArchitect = true;
        }
      })
    }
    if(isArchitect) {
      dispatch(
        handleField(
          "search-preview",
          "components.div.children.body.children.cardContent.children.declarationSummary.children.headers",
          "visible",
          true
        )
      );
      dispatch(
        handleField(
          "search-preview",
          "components.div.children.body.children.cardContent.children.declarationSummary.children.header.children.body.children.firstStakeholder",
          "visible",
          true
        )
      );
    }
  }

  if (status && status === "CITIZEN_APPROVAL_INPROCESS") {
    let userInfo = JSON.parse(getUserInfo()),
    roles = get(userInfo, "roles"),
    owners = get(response.Bpa["0"].landInfo, "owners"),
    archtect = "BPA_ARCHITECT",
    isTrue = false, isOwner = true;
    if(roles && roles.length > 0) {
      roles.forEach(role => {
        if(role.code === archtect) {
          isTrue = true;
        }
      })
    }

    if(isTrue && owners && owners.length > 0) {
      owners.forEach(owner => {
        if(owner.mobileNumber === userInfo.mobileNumber) { //owner.uuid === userInfo.uuid
          if(owner.roles && owner.roles.length > 0 ) {
            owner.roles.forEach(owrRole => {
              if(owrRole.code === archtect) {
                isOwner = false;
              }
            })
          }
        }
      })
    }
    if(isTrue && isOwner) {
      dispatch(
        handleField(
          "search-preview",
          "components.div.children.citizenFooter",
          "visible",
          false
        )
      )
    } else {
      dispatch(
        handleField(
          "search-preview",
          "components.div.children.body.children.cardContent.children.declarationSummary.children.headers",
          "visible",
          true
        )
      );
      dispatch(
        handleField(
        "search-preview",
        "components.div.children.body.children.cardContent.children.declarationSummary.children.header.children.body.children.citizen",
        "visible",
        true
        )
      )
    }
  }

  
  if(response && response.Bpa["0"] && response.Bpa["0"].documents) {
    dispatch(prepareFinalObject("documentsTemp", response.Bpa["0"].documents));
  }

  if ( response && get(response, "Bpa[0].approvalNo") ) {
    dispatch(
      handleField(
        "search-preview",
        "components.div.children.headerDiv.children.header2.children.titlebar2.children.permitNumber",
        "props.number",
        get(response, "Bpa[0].approvalNo")
      )
    );
  } else {

    dispatch(
      handleField(
      "search-preview",
      "components.div.children.headerDiv.children.header2.children.titlebar2.children.permitNumber",
      "visible",
      false
    )
  )
  }

  dispatch(
    handleField(
      "search-preview",
      "components.div.children.headerDiv.children.header.children.leftContainerH.children.applicationNumber",
      "props.number",
      applicationNumber
    )
  );

  // Set Institution/Applicant info card visibility
  if (
    get(
      response,
      "BPA.landInfo.ownershipCategory",
      ""
    ).startsWith("INSTITUTION")
  ) {
    dispatch(
      handleField(
        "search-preview",
        "components.div.children.body.children.cardContent.children.applicantSummary",
        "visible",
        false
      )
    );
  };

  setProposedBuildingData(state, dispatch);

  if(get(response, "Bpa[0].additionalDetails.validityDate")) {
    dispatch(
      handleField(
        "search-preview",
        "components.div.children.headerDiv.children.header.children.rightContainerH.children.footNote",
        "props.number",
        convertEpochToDate(get(response, "Bpa[0].additionalDetails.validityDate"))
      )
    );

    dispatch(
      handleField(
        "search-preview",
        "components.div.children.headerDiv.children.header.children.rightContainerH.children.footNote.visible",
        true
      )
    );
  }

  dispatch(prepareFinalObject("documentDetailsPreview", {}));
  requiredDocumentsData(state, dispatch, action);
  setDownloadMenu(action, state, dispatch);
  dispatch(fetchLocalizationLabel(getLocale(), tenantId, tenantId));
};

const screenConfig = {
  uiFramework: "material-ui",
  name: "search-preview",
  beforeInitScreen: (action, state, dispatch) => {
    const applicationNumber = getQueryArg(
      window.location.href,
      "applicationNumber"
    );
    const tenantId = getQueryArg(window.location.href, "tenantId");
    setSearchResponse(state, dispatch, applicationNumber, tenantId, action);

    const queryObject = [
      { key: "tenantId", value: tenantId },
      { key: "businessServices", value: "BPA" }
    ];
    setBusinessServiceDataToLocalStorage(queryObject, dispatch);
    // Hide edit buttons

    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.nocSummary.children.cardContent.children.header.children.editSection.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.applicantSummary.children.cardContent.children.header.children.editSection.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.previewSummary.children.cardContent.children.header.children.editSection.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.basicSummary.children.cardContent.children.header.children.editSection.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.scrutinySummary.children.cardContent.children.header.children.editSection.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.plotAndBoundaryInfoSummary.children.cardContent.children.header.children.editSection.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.nocSummary.children.cardContent.children.uploadedNocDocumentDetailsCard.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.fieldSummary.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.fieldinspectionSummary.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.permitConditions.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.permitListSummary.visible",
      false
    );
    set(
      action,
      "screenConfig.components.div.children.body.children.cardContent.children.declarationSummary.children.headers.visible",
      false
    );
    
    return action;
  },
  components: {
    div: {
      uiFramework: "custom-atoms",
      componentPath: "Div",
      props: {
        className: "common-div-css bpa-searchpview"
      },
      children: {
        headerDiv: {
          uiFramework: "custom-atoms",
          componentPath: "Container",
          children: {
            header: {
              gridDefination: {
                xs: 12,
                sm: 6,
                md: 6
              },
              ...titlebar
            },
            header2: {
              uiFramework: "custom-atoms",
              componentPath: "Container",
              props: {
                color: "primary",
                style: { justifyContent: "flex-end" }
              },
              gridDefination: {
                xs: 12,
                sm: 6,
                md: 6,
                align: "right"
              },
              children: {
                  titlebar2
                    }
            }
          }
        },
        
        taskStatus: {
          uiFramework: "custom-containers-local",
          componentPath: "WorkFlowContainer",
          moduleName: "egov-workflow",
          visible: true,
          props: {
            dataPath: "BPA",
            moduleName: "BPA",
            updateUrl: "/bpa-services/v1/bpa/_update"
          }
        },
        sendToArchPickerDialog :{
          componentPath: "Dialog",
          props: {
            open: false,
            maxWidth: "md"
          },
          children: {
            dialogContent: {
              componentPath: "DialogContent",
              props: {
                classes: {
                  root: "city-picker-dialog-style"
                }
              },
              children: {
                popup: getCommonContainer({
                  header: getCommonHeader({
                    labelName: "Forward Application",
                    labelKey: "BPA_FORWARD_APPLICATION_HEADER"
                  }),
                  cityPicker: getCommonContainer({
                    cityDropdown: {
                      uiFramework: "custom-molecules-local",
                      moduleName: "egov-bpa",
                      componentPath: "ActionDialog",
                      required: true,
                      gridDefination: {
                        xs: 12,
                        sm: 12
                      },
                      props: {}
                    },
                  })
                })
              }
            }
          }
        },
        body: getCommonCard({
          // estimateSummary: estimateSummary,
          fieldSummary: fieldSummary,
          fieldinspectionSummary: fieldinspectionSummary,
          basicSummary: basicSummary,
          scrutinySummary:scrutinySummary,
          applicantSummary: applicantSummary,
          previewSummary: previewSummary,
          declarationSummary: declarationSummary,
          permitConditions: permitConditions,
          permitListSummary : permitListSummary
        }),
        citizenFooter: process.env.REACT_APP_NAME === "Citizen" ? citizenFooter : {}
      }
    }
  }
};

export default screenConfig;
