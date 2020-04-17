
import { getCommonCard, getCommonContainer, getCommonHeader, getStepperObject } from "egov-ui-framework/ui-config/screens/specs/utils";
import { handleScreenConfigurationFieldChange as handleField, prepareFinalObject } from "egov-ui-framework/ui-redux/screen-configuration/actions";
import { getQueryArg } from "egov-ui-framework/ui-utils/commons";
import { getTenantId, getUserInfo } from "egov-ui-kit/utils/localStorageUtils";
import cloneDeep from "lodash/cloneDeep";
import get from "lodash/get";
import set from "lodash/set";
import { httpRequest } from "../../../../ui-utils";
import { furnishNocResponse, getSearchResults, prepareDocumentsUploadData, setApplicationNumberBox } from "../../../../ui-utils/commons";
import { getCurrentFinancialYear, showHideMutationDetailsCard } from "../utils";
import { footer } from "./applyResource/footer";
import { mutationDetails } from "./applyResourceMutation/mutationDetails";
import { documentDetails } from "./applyResourceMutation/mutationDocuments";
import { mutationSummary } from "./applyResourceMutation/mutationSummary";
import { registrationDetails } from "./applyResourceMutation/registrationDetails";
import { transfereeDetails } from './applyResourceMutation/transfereeDetails';
import { declarationSummary } from "./summaryResource/declarationSummary";
import { documentsSummary } from "./summaryResource/documentsSummary";
import { registrationSummary } from "./summaryResource/registrationSummary";
import { transfereeInstitutionSummary, transfereeSummary } from "./summaryResource/transfereeSummary";
import { transferorInstitutionSummary, transferorSummary } from "./summaryResource/transferorSummary";
import { transferorInstitutionSummary as ti1, transferorSummary as ts1 } from "./summaryResource/transferorSummary1";


export const stepsData = [
  { labelName: "Transfer Details", labelKey: "PT_MUTATION_TRANSFER_DETAILS" },
  { labelName: "Document Upload", labelKey: "PT_MUTATION_DOCUMENT_UPLOAD" },
  { labelName: "Summary", labelKey: "PT_MUTATION_SUMMARY" }
];
export const stepper = getStepperObject(
  { props: { activeStep: 0 } },
  stepsData
);

const applicationNumberContainer = () => {
  const applicationNumber = getQueryArg(
    window.location.href,
    "applicationNumber"
  );
  if (applicationNumber)
    return {
      uiFramework: "custom-atoms-local",
      moduleName: "egov-pt",
      componentPath: "ApplicationNoContainer",
      props: {
        number: `${applicationNumber}`,
        visibility: "hidden"
      },
      visible: true
    };
  else return {};
};

// const getConsumerID = () => {
//   let mutationUrl = window.location.href;
//   let exp=new RegExp("[A-Z]{2,}\-[0-9]{3,}\-[0-9]{6,}");
//   let consumerId = mutationUrl.match(exp);
//   return consumerId[0];

// };

export const header = getCommonContainer({
  header: getCommonHeader({
    labelName: `Transfer of Ownership (${getCurrentFinancialYear()})`, //later use getFinancialYearDates
    labelKey: "PT_MUTATION_TRANSFER_HEADER"
  }),
  //applicationNumber: applicationNumberContainer()
  applicationNumber: {
    uiFramework: "custom-atoms-local",
    moduleName: "egov-pt",
    componentPath: "ApplicationNoContainer",
    props: {
      number: getQueryArg(window.location.href, "consumerCode"),
      label: {
        labelValue: "Property Tax Unique ID.",
        labelKey: "PT_PROPERTY_TAX_UNIQUE_ID"
      }
    },
    visible: true
  }
});


export const formwizardFirstStep = {
  uiFramework: "custom-atoms",
  componentPath: "Form",
  props: {
    id: "apply_form1"
  },
  children: {
    transferorDetails: { ...ts1 },
    transferorInstitutionDetails: { ...ti1 },
    transfereeDetails,
    mutationDetails,
    registrationDetails
  }
};

export const formwizardSecondStep = {
  uiFramework: "custom-atoms",
  componentPath: "Form",
  props: {
    id: "apply_form2"
  },
  children: {
    documentDetails: documentDetails
  },
  visible: false
};

export const formwizardThirdStep = {
  uiFramework: "custom-atoms",
  componentPath: "Form",
  props: {
    id: "apply_form3"
  },
  children: {
    summary: getCommonCard({
      transferorSummary: { ...transferorSummary },
      transferorInstitutionSummary: { ...transferorInstitutionSummary },
      transfereeSummary: transfereeSummary,
      transfereeInstitutionSummary: transfereeInstitutionSummary,
      mutationSummary: mutationSummary,
      registrationSummary: registrationSummary,
      documentsSummary: documentsSummary,
      declarationSummary: declarationSummary
    }),

  },

  visible: false
};

const getPropertyData = async (action, state, dispatch) => {
  let tenantId = getQueryArg(window.location.href, "tenantId");
  let consumerCode = getQueryArg(window.location.href, "consumerCode");

  try {
    let queryObject = [
      {
        key: "tenantId",
        value: tenantId
      },
      {
        key: "propertyIds",
        value: consumerCode
      }
    ];
    let payload = null;
    payload = await httpRequest(
      "post",
      "/property-services/property/_search",
      "_search",
      queryObject,

    );

    if (payload && payload.Properties && payload.Properties[0].owners && payload.Properties[0].owners.length > 0) {

      let owners = [];
      payload.Properties[0].owners.map(owner => {
        owner.documentUid = owner.documents ? owner.documents[0].documentUid : "NA";
        owner.documentType = owner.documents ? owner.documents[0].documentType : "NA";

        if (owner.status == "ACTIVE") {
          owners.push(owner);
        }
      });


      payload.Properties[0].ownersInit = owners;
      payload.Properties[0].ownershipCategoryInit = payload.Properties[0].ownershipCategory;
    }
    const previousPropertyUuid = payload.Properties[0].additionalDetails && payload.Properties[0].additionalDetails.previousPropertyUuid;
    payload.Properties[0].additionalDetails = { previousPropertyUuid };
    dispatch(prepareFinalObject("Property", payload.Properties[0]));

    let owners = get(state, "screenConfiguration.preparedFinalObject.Property.owners");
    if (owners && owners.length > 0) {
      owners.map(owner => {
        if (owner.ownerType != 'NONE' && owner.status == "ACTIVE") {

          set(
            action.screenConfig,
            "components.div.children.formwizardFirstStep.children.transferorDetails.children.cardContent.children.cardOne.props.scheama.children.cardContent.children.ownerContainer.children.ownerSpecialDocumentID.props.style.display",
            'block'
          );
          set(
            action.screenConfig,
            "components.div.children.formwizardFirstStep.children.transferorDetails.children.cardContent.children.cardOne.props.scheama.children.cardContent.children.ownerContainer.children.ownerSpecialDocumentType.props.style.display",
            'block'
          );
          set(
            action.screenConfig,
            "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.transferorSummary.children.cardContent.children.cardOne.props.scheama.children.cardContent.children.ownerContainer.children.ownerSpecialDocumentID.props.style.display",
            'block'
          );
          set(
            action.screenConfig,
            "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.transferorSummary.children.cardContent.children.cardOne.props.scheama.children.cardContent.children.ownerContainer.children.ownerSpecialDocumentType.props.style.display",
            'block'
          );
        }
      })
    }

    if (
      get(
        state,
        "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.applicantDetails.ownerShipType",
        ""
      ).includes("MULTIPLEOWNERS")
    ) {
      set(
        action.screenConfig,
        "components.div.children.formwizardThirdStep.children.applicantDetails.children.cardContent.children.applicantTypeContainer.children.singleApplicantContainer.props.style",
        { display: "none" }
      );
      set(
        action.screenConfig,
        "components.div.children.formwizardThirdStep.children.applicantDetails.children.cardContent.children.applicantTypeContainer.children.multipleApplicantContainer.props.style",
        {}
      );
    } else if (
      get(
        state,
        "screenConfiguration.preparedFinalObject.Property.ownershipCategory",
        ""
      ).includes("INSTITUTIONAL")
    ) {
      set(
        action.screenConfig,
        "components.div.children.formwizardFirstStep.children.transferorDetails.props.style",
        { display: "none" }
      );
      set(
        action.screenConfig,
        "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.transferorSummary.props.style",
        { display: "none" }
      );
      // set(
      //   action.screenConfig,
      //  "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.transferorInstitutionSummary.props.style",
      //   {background:'grey'}
      // );

    } else {
      // set(
      //   action.screenConfig,
      //   "components.div.children.formwizardFirstStep.children.transferorDetails.props.style",
      //   { display: "none" }
      // );
      // set(
      //   action.screenConfig,
      //   "components.div.children.formwizardFirstStep.children.transferorDetails.props.style",
      //   {background:'white'}
      // );
      set(
        action.screenConfig,
        "components.div.children.formwizardFirstStep.children.transferorInstitutionDetails.props.style",
        { display: "none" }
      );
      set(
        action.screenConfig, "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.transferorInstitutionSummary.props.style",
        { display: "none" }
      );
    }

    dispatch(prepareFinalObject("PropertiesTemp", cloneDeep(payload.Properties)));
  } catch (e) {
    console.log(e);
  }
};

const getSpecialCategoryDocumentTypeMDMSData = async (action, state, dispatch) => {
  let tenantId = 'pb'
  let mdmsBody = {
    MdmsCriteria: {
      tenantId: tenantId,
      moduleDetails: [
        {
          moduleName: "PropertyTax",
          masterDetails: [{ name: "OwnerTypeDocument" }, { name: "PropertyConfiguration" }]

        }
      ]
    }
  };
  try {
    let payload = null;
    payload = await httpRequest(
      "post",
      "/egov-mdms-service/v1/_search",
      "_search",
      [],
      mdmsBody
    );

    let OwnerTypeDocument = get(
      payload,
      "MdmsRes.PropertyTax.OwnerTypeDocument"
    )
    let propertyConfiguation = get(payload, "MdmsRes.PropertyTax.PropertyConfiguration");
    dispatch(prepareFinalObject("applyScreenMdmsData.OwnerTypeDocument", OwnerTypeDocument));
    dispatch(prepareFinalObject("PropertyConfiguration", propertyConfiguation));
    showHideMutationDetailsCard(action, state, dispatch);
  } catch (e) {
    console.log(e);
  }

};
const getMdmsData = async (action, state, dispatch) => {
  let tenantId = process.env.REACT_APP_NAME === "Employee" ? getTenantId() : JSON.parse(getUserInfo()).permanentCity;
  let mdmsBody = {
    MdmsCriteria: {
      tenantId: tenantId,
      moduleDetails: [
        {
          moduleName: "common-masters",
          masterDetails: [{ name: "OwnerType" }, { name: "OwnerShipCategory" }]
        },
        {
          moduleName: "firenoc",
          masterDetails: [{ name: "BuildingType" }, { name: "FireStations" }]
        },
        {
          moduleName: "egov-location",
          masterDetails: [
            {
              name: "TenantBoundary"
            }
          ]
        },
        {
          moduleName: "tenant",
          masterDetails: [
            {
              name: "tenants"
            }
          ]
        },
        { moduleName: "PropertyTax", masterDetails: [{ name: "MutationDocuments" }] }
      ]
    }
  };
  try {
    let payload = null;
    payload = await httpRequest(
      "post",
      "/egov-mdms-service/v1/_search",
      "_search",
      [],
      mdmsBody
    );

    let OwnerShipCategory = get(
      payload,
      "MdmsRes.common-masters.OwnerShipCategory"
    )
    let institutions = []
    OwnerShipCategory = OwnerShipCategory.map(category => {
      if (category.code.includes("INDIVIDUAL")) {
        return category.code;
      }
      else {
        let code = category.code.split(".");
        institutions.push({ code: code[1], parent: code[0], active: true });
        return code[0];
      }
    });
    OwnerShipCategory = OwnerShipCategory.filter((v, i, a) => a.indexOf(v) === i)
    OwnerShipCategory = OwnerShipCategory.map(val => { return { code: val, active: true } });
    payload.MdmsRes['common-masters'].Institutions = institutions;
    payload.MdmsRes['common-masters'].OwnerShipCategory = OwnerShipCategory;

    dispatch(prepareFinalObject("applyScreenMdmsData", payload.MdmsRes));
  } catch (e) {
    console.log(e);
  }
};

const getMdmsTransferReasonData = async (action, state, dispatch) => {
  let tenantId = 'pb'
  let mdmsBody = {
    MdmsCriteria: {
      tenantId: tenantId,
      moduleDetails: [
        { moduleName: "PropertyTax", masterDetails: [{ name: "ReasonForTransfer" }] }
      ]
    }
  };
  try {
    let payload = null;
    payload = await httpRequest(
      "post",
      "/egov-mdms-service/v1/_search",
      "_search",
      [],
      mdmsBody
    );
    dispatch(prepareFinalObject("ReasonForTransfer", payload.MdmsRes));
  } catch (e) {
    console.log(e);
  }
};


const getFirstListFromDotSeparated = list => {
  list = list.map(item => {
    if (item.active) {
      return item.code.split(".")[0];
    }
  });
  list = [...new Set(list)].map(item => {
    return { code: item };
  });
  return list;
};



export const prepareEditFlow = async (
  state,
  dispatch,
  applicationNumber,
  tenantId
) => {
  // const buildings = get(
  //   state,
  //   "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.buildings",
  //   []
  // );
  if (applicationNumber) {
    let response = await getSearchResults([
      {
        key: "tenantId",
        value: tenantId
      },
      { key: "propertyIds", value: applicationNumber }
    ]);
    // let response = sampleSingleSearch();

    response = furnishNocResponse(response);

    dispatch(prepareFinalObject("Properties", get(response, "Properties", [])));
    if (applicationNumber) {
      setApplicationNumberBox(state, dispatch, applicationNumber);
    }
    // Set no of buildings radiobutton and eventually the cards
    let noOfBuildings =
      get(response, "FireNOCs[0].fireNOCDetails.noOfBuildings", "SINGLE") ===
        "MULTIPLE"
        ? "MULTIPLE"
        : "SINGLE";
    dispatch(
      handleField(
        "apply",
        "components.div.children.formwizardSecondStep.children.propertyDetails.children.cardContent.children.propertyDetailsConatiner.children.buildingRadioGroup",
        "props.value",
        noOfBuildings
      )
    );

    // Set no of buildings radiobutton and eventually the cards
    let nocType =
      get(response, "FireNOCs[0].fireNOCDetails.fireNOCType", "NEW") === "NEW"
        ? "NEW"
        : "PROVISIONAL";
    dispatch(
      handleField(
        "apply",
        "components.div.children.formwizardFirstStep.children.nocDetails.children.cardContent.children.nocDetailsContainer.children.nocRadioGroup",
        "props.value",
        nocType
      )
    );

    // setCardsIfMultipleBuildings(state, dispatch);

    // Set sample docs upload
    // dispatch(prepareFinalObject("documentsUploadRedux", sampleDocUpload()));
  }
};

const screenConfig = {
  uiFramework: "material-ui",
  name: "apply",
  beforeInitScreen: (action, state, dispatch) => {
    const applicationNumber = getQueryArg(
      window.location.href,
      "applicationNumber"
    );
    const tenantId = getQueryArg(window.location.href, "tenantId");
    const step = getQueryArg(window.location.href, "step");
    dispatch(
      prepareFinalObject(
        "Property.additionalDetails",
        {}
      )
    );

    set(
      action.screenConfig,
      "components.div.children.formwizardFirstStep.children.transferorDetails.children.cardContent.children.cardOne.props.scheama.children.cardContent.children.ownerContainer.children.ownerSpecialDocumentID.props.style.display",
      'none'
    );
    set(
      action.screenConfig,
      "components.div.children.formwizardFirstStep.children.transferorDetails.children.cardContent.children.cardOne.props.scheama.children.cardContent.children.ownerContainer.children.ownerSpecialDocumentType.props.style.display",
      'none'
    );
    set(
      action.screenConfig,
      "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.transferorSummary.children.cardContent.children.cardOne.props.scheama.children.cardContent.children.ownerContainer.children.ownerSpecialDocumentID.props.style.display",
      'none'
    );
    set(
      action.screenConfig,
      "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.transferorSummary.children.cardContent.children.cardOne.props.scheama.children.cardContent.children.ownerContainer.children.ownerSpecialDocumentType.props.style.display",
      'none'
    );
    getPropertyData(action, state, dispatch);

    //Set Module Name
    set(state, "screenConfiguration.moduleName", "pt-mutation");

    // Set MDMS Data
    getMdmsData(action, state, dispatch).then(response => {
      // Set Dropdowns Data
      let buildingUsageTypeData = get(
        state,
        "screenConfiguration.preparedFinalObject.applyScreenMdmsData.firenoc.BuildingType",
        []
      );
      buildingUsageTypeData = getFirstListFromDotSeparated(
        buildingUsageTypeData
      );
      dispatch(
        prepareFinalObject(
          "applyScreenMdmsData.DropdownsData.BuildingUsageType",
          buildingUsageTypeData
        )
      );
      let ownershipCategory = get(
        state,
        "screenConfiguration.preparedFinalObject.applyScreenMdmsData.common-masters.OwnerShipCategory",
        []
      );
      //  ownershipCategory = getFirstListFromDotSeparated(ownershipCategory);
      dispatch(
        prepareFinalObject(
          "applyScreenMdmsData.DropdownsData.OwnershipCategory",
          ownershipCategory
        )
      );

      // Set Documents Data (TEMP)
      prepareDocumentsUploadData(state, dispatch);
    });

    getMdmsTransferReasonData(action, state, dispatch);

    getSpecialCategoryDocumentTypeMDMSData(action, state, dispatch);
    // Search in cprepareDocumentsUploadDataase of EDIT flow
    prepareEditFlow(state, dispatch, applicationNumber, tenantId);

    // Code to goto a specific step through URL
    if (step && step.match(/^\d+$/)) {
      let intStep = parseInt(step);
      set(
        action.screenConfig,
        "components.div.children.stepper.props.activeStep",
        intStep
      );
      let formWizardNames = [
        "formwizardFirstStep",
        "formwizardSecondStep",
        "formwizardThirdStep"
      ];
      for (let i = 0; i < 4; i++) {
        set(
          action.screenConfig,
          `components.div.children.${formWizardNames[i]}.visible`,
          i == step
        );
        set(
          action.screenConfig,
          `components.div.children.footer.children.previousButton.visible`,
          step != 0
        );
      }
    }

    // Set defaultValues of radiobuttons and selectors
    let noOfBuildings = get(
      state,
      "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.noOfBuildings",
      "SINGLE"
    );
    set(
      state,
      "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.noOfBuildings",
      noOfBuildings
    );
    let nocType = get(
      state,
      "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.fireNOCType",
      "PROVISIONAL"
    );
    set(
      state,
      "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.fireNOCType",
      nocType
    );

    // Preset multi-cards (CASE WHEN DATA PRE-LOADED)
    if (
      get(
        state,
        "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.noOfBuildings"
      ) === "MULTIPLE"
    ) {
      set(
        action.screenConfig,
        "components.div.children.formwizardSecondStep.children.propertyDetails.children.cardContent.children.propertyDetailsConatiner.children.buildingDataCard.children.singleBuildingContainer.props.style",
        { display: "none" }
      );
      set(
        action.screenConfig,
        "components.div.children.formwizardSecondStep.children.propertyDetails.children.cardContent.children.propertyDetailsConatiner.children.buildingDataCard.children.multipleBuildingContainer.props.style",
        {}
      );
    }
    if (
      get(
        state,
        "screenConfiguration.preparedFinalObject.FireNOCs[0].fireNOCDetails.fireNOCType"
      ) === "PROVISIONAL"
    ) {
      set(
        action.screenConfig,
        "components.div.children.formwizardFirstStep.children.nocDetails.children.cardContent.children.nocDetailsContainer.children.provisionalNocNumber.props.style",
        { visibility: "hidden" }
      );
    }

    set(
      action.screenConfig,
      "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.propertySummary.children.cardContent.children.header.children.editSection.visible",
      false
    );
    set(
      action.screenConfig,
      "components.div.children.formwizardThirdStep.children.summary.children.cardContent.children.transferorSummary.children.cardContent.children.header.children.editSection.visible",
      false
    );

    return action;
  },
  components: {
    div: {
      uiFramework: "custom-atoms",
      componentPath: "Div",
      props: {
        className: "common-div-css"
      },
      children: {
        headerDiv: {
          uiFramework: "custom-atoms",
          componentPath: "Container",
          children: {
            header: {
              gridDefination: {
                xs: 12,
                sm: 10
              },
              ...header
            }
          }
        },
        stepper,
        formwizardFirstStep,
        formwizardSecondStep,
        formwizardThirdStep,
        footer
      }
    }
  }
};

export default screenConfig;
