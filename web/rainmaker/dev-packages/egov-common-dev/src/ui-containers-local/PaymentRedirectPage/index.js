import { setRoute } from "egov-ui-framework/ui-redux/app/actions";
import { httpRequest } from "egov-ui-framework/ui-utils/api";
import { isPublicSearch } from "egov-ui-framework/ui-utils/commons";
import get from "lodash/get";
import set from "lodash/set";
import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { getSearchResults } from "../../ui-utils/commons";
import { prepareFinalObject } from "egov-ui-framework/ui-redux/screen-configuration/actions";

class PaymentRedirect extends Component {
  getBusinessServiceMdmsData = async (tenantId) => {
    const {prepareFinalObject} = this.props
    let mdmsBody = {
      MdmsCriteria: {
        tenantId: tenantId,
        moduleDetails: [
          {
            moduleName: "BillingService",
            masterDetails: [{ name: "BusinessService" }]
          },
          {
            moduleName: "common-masters",
            masterDetails: [{ name: "uiCommonPay" }]
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
      prepareFinalObject("businessServiceMdmsData", payload.MdmsRes);
    } catch (e) {
      console.log(e);
    }
  };

  checkPublicSearch = () => {
    return isPublicSearch();
  }

  componentDidMount = async () => {
    let { search } = this.props.location;
    const {reduxObj , prepareFinalObject} = this.props;
    const txnQuery=search.split('&')[0].replace('eg_pg_txnid','transactionId');
    console.log(txnQuery,'txnQuery');
    const isPublicSearch = this.checkPublicSearch();
    
    try {
      let pgUpdateResponse = await httpRequest(
        "post",
        "pg-service/transaction/v1/_update" + txnQuery,
        "_update",
        [],
        {}
      );
      let consumerCode = get(pgUpdateResponse, "Transaction[0].consumerCode");
      let tenantId = get(pgUpdateResponse, "Transaction[0].tenantId");
      if (get(pgUpdateResponse, "Transaction[0].txnStatus") === "FAILURE") {
        const url = `/egov-common/acknowledgement?status=${"failure"}&consumerCode=${consumerCode}&tenantId=${tenantId}`;
        const ackFailureUrl = isPublicSearch ? `/withoutAuth${url}` : url;
        this.props.setRoute(ackFailureUrl);
      } else {
        const srcQuery=`?tenantId=${tenantId}&consumerCodes=${consumerCode}`
 
 
        let searchResponse = await httpRequest(
          "post",
          "collection-services/payments/_search" + srcQuery,
          "_search",
          [],
          {}
        );
        const businessService = get(searchResponse, "Payments[0].paymentDetails[0].businessService");
        let transactionId = get(searchResponse, "Payments[0].paymentDetails[0].receiptNumber");
        this.getBusinessServiceMdmsData(tenantId).then(response => {
          const commonPayDetails = get(reduxObj , "businessServiceMdmsData.common-masters.uiCommonPay");
          const index = commonPayDetails && commonPayDetails.findIndex((item) => {
            return item.code == businessService;
          });
          if(index > -1){
            prepareFinalObject("commonPayInfo" , commonPayDetails[index]);
          }else{
            const details = commonPayDetails.filter(item => item.code === "DEFAULT");
            prepareFinalObject("commonPayInfo" , details);
          }
          const url = `/egov-common/acknowledgement?status=${"success"}&consumerCode=${consumerCode}&tenantId=${tenantId}&receiptNumber=${transactionId}&businessService=${businessService}`;
          const ackSuccessUrl = isPublicSearch ? `/withoutAuth${url}` : url;
          this.props.setRoute(ackSuccessUrl);
      })
      }
    } catch (e) {
      alert(e);
    }
  };
  render() {
    return <div />;
  }
}

const mapStateToProps = (state) => {
  const reduxObj = get(state , "screenConfiguration.preparedFinalObject");
  return {reduxObj};
}

const mapDispatchToProps = dispatch => {
  return {
    setRoute: route => dispatch(setRoute(route)),
    prepareFinalObject : (jsonPath , value) => dispatch(prepareFinalObject(jsonPath , value))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PaymentRedirect));
