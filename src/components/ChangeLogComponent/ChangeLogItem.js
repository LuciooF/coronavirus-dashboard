// @flow

import React from "react";
import moment from "moment";
import { Markdown } from "./ChangeLogComponent.styles";
import { Link } from "react-router-dom";

import type { ComponentType } from "react";


const ChangeLogItemBody: ComponentType = ({ data }) => {

    return <div className="govuk-body govuk-!-margin-top-0 govuk-!-margin-bottom-0">
        <Markdown className="govuk-body govuk-!-margin-top-0 govuk-!-margin-bottom-0"
                  dangerouslySetInnerHTML={{ __html: data.body }}/>
    </div>

}; // ChangeLogItemBody


const ChangeLogHeading: ComponentType = ({ data }) => {

    return <h3 className={ "govuk-heading-s govuk-!-font-size-19 govuk-!-margin-bottom-1" }>
        <small className={ "govuk-caption-m govuk-!-font-size-19 govuk-!-margin-bottom-1" }>
            <time dateTime={data.date}>
                <span className={ "govuk-visually-hidden" }>Date of change: </span>
                { moment(data.date).format("D MMMM") }
            </time>
            {/*<ChangeLogSpan color={ colour?.text ?? "#000000" }*/}
            {/*               bgColor={ colour?.background ?? "inherit" }>*/}
            {/*    { data.type }*/}
            {/*</ChangeLogSpan>*/}
        </small>
        {
            data?.relativeUrl
                ? <Link to={ data.relativeUrl } className={ "govuk-link govuk-!-font-weight-bold" }>
                    { data.headline }
                </Link>
                : data.headline
        }
    </h3>

};  // ChangeLogHeading


export const ChangeLogItem: ComponentType = ({ data, changeTypes, colour }) => {

    return <div className="govuk-body-s govuk-!-margin-top-3 govuk-!-margin-bottom-6">
        <ChangeLogHeading data={ data }/>
        <ChangeLogItemBody changeTypes={ changeTypes } data={ data }/>
    </div>

}; // ChangeLogItem
