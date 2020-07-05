// @flow

import React, { useState, useRef, useEffect } from 'react';
import type { ComponentType } from 'react';
import { Link } from "react-router-dom";

import ModalTooltip from "components/Modal";

import type { Props, ValueItemType } from './Card.types';
import {
    HalfCard,
    HalfCardHeader,
    HalfCardHeading,
    HalfCardSplitBody,
    FullCard,
    Caption,
    BodySection,
    DataContainer,
    DataColour,
    Heading,
    DataNumbersContainer,
    NumericData,
    DataLabel,
    Number,
    HBodySection
} from './Card.styles';
import numeral from 'numeral'
import ReactTooltip from "react-tooltip";
import { colours, fieldToStructure, analytics, strFormat } from "common/utils";
import useApi from "hooks/useApi";
import moment from "moment";
import {
    AgeSexBreakdownTabContent,
    MultiAreaStaticTabContent,
    TabContent,
    TabLink,
    TabLinkContainer
} from "components/TabLink";
import { Radio } from "components/GovUk";
import DropdownButton from "components/DropdownButton";
import Loading from "components/Loading";
import { NotAvailable } from "components/Widgets";


const VisualSection: ComponentType<Props> = ({ children }: Props) => {

    return <BodySection>
        { children }
    </BodySection>

}; // Visuals


const NumericReports: ComponentType<Props> = ({ children, horizontal=false }: Props) => {

    if ( horizontal )
        return <HBodySection>{ children }</HBodySection>;

    return <BodySection>{ children }</BodySection>

}; // ValueItemContainer


const HeadlineNumbers = ({ params, headlineNumbers=[] }) => {

    return <NumericReports horizontal={ true }>{
        headlineNumbers?.map((item, index) =>
            <ValueBox params={ params }
                      key={ `headline-number-${index}` }
                      { ...item }/>
        ) ?? null
    }</NumericReports>

} // HeadlineNumbers


const ValueBox = ({ caption, valueItems, ...rest }) => {

    const
        { chart={}, isEnabled=true, setChartState=() => null } = rest,
        tipId = encodeURI(caption);

    return <DataContainer>
        {
            ( chart?.colour ?? false ) === false
                ?  null
                : <DataColour role={ "button" }
                              data-for={ tipId }
                              data-tip={
                                  `Click to ${ isEnabled ? "hide" : "show" } 
                                  the "${ caption.toLowerCase() }" on the graph.`
                              }
                              onClick={ () => {

                                  analytics("Chart toggle", caption, isEnabled ? "ON" : "OFF" )

                                  setChartState()
                              } }
                              colour={ isEnabled ? (colours?.[chart.colour] ?? "") : "none" } />
        }
        <Heading>{ caption }</Heading>
        <DataNumbersContainer>{
            valueItems.map((item, index) =>
                item.value &&
                <ValueItem key={ `value-item-${ index }` }
                           value={ item.value }
                           label={ item.label }
                           tooltip={ item.tooltip }
                           sign={ item.sign }
                           params={ rest.params }/>
            )
        }</DataNumbersContainer>
        <ReactTooltip id={ tipId }
                      place={ "right" }
                      backgroundColor={ "#0b0c0c" }
                      className={ "tooltip" }
                      effect={ "solid" }/>
    </DataContainer>

};  // getValueItemSections


const ValueItem: ComponentType<ValueItemType> = ({ label, value, params, tooltip=null, sign=null }: ValueItemType) => {

    const
        tipId = encodeURI(`${label}-${value}`),
        data = useApi({
            conjunctiveFilters: params,
            extraParams: [
                { key: "latestBy", sign: "=", value: value }
            ],
            structure: {
                date: "date",
                value: value
            },
            defaultResponse: null
        }),
        replacements = {
            kwargs: {
                ...(data?.[0] ?? {}),
                date: moment(data?.[0]?.date ?? null).format("dddd, D MMMM YYYY")
            }
        },
        formattedTooltip = strFormat(tooltip, replacements);

    return <NumericData>
        { label && <DataLabel>{ label }</DataLabel> }
        <Number>
            <ModalTooltip data-tip={ formattedTooltip }
                          data-for={ tipId }
                          markdownPath={ value }
                          replacements={ replacements }>
                {
                    data !== null
                        ? (data?.length ?? 0) > 0
                        ? numeral(data[0].value).format("0,0")
                        : <NotAvailable/>
                        : <Loading/>
                }{ (data && sign) ? sign : null }
                <p className={ "govuk-visually-hidden" }>
                    Abstract information on { label }: { formattedTooltip }<br/>
                    Click for additional details.
                </p>
            </ModalTooltip>
        </Number>
        <ReactTooltip id={ tipId }
                      place={ "right" }
                      backgroundColor={ "#0b0c0c" }
                      className={ "tooltip" }
                      effect={ "solid" }/>
    </NumericData>

}; // ValueItem


const CardHeader: ComponentType<*> = ({ heading, caption="", linkToHeading=false, children }: Props) => {

    return <>
        <HalfCardHeader className={ linkToHeading ? "" : "govuk-!-margin-bottom-2"}>
            <HalfCardHeading>
            { heading }
            <Caption>{ caption }</Caption>
            </HalfCardHeading>
            {
                linkToHeading &&
                <Link to={ heading.toLowerCase() }
                      className={ "govuk-link govuk-!-font-weight-bold govuk-link--no-visited-state no-decoration smaller" }>
                    { linkToHeading }
                </Link>
            }
            { children }
        </HalfCardHeader>
        {
            linkToHeading &&
            <hr className={ "govuk-section-break govuk-section-break--m govuk-!-margin-top-0 govuk-section-break--visible" }/>
        }
    </>;

};  // CardHeader


const DownloadOptions = ({ heading, baseUrl, noCsv }) => {

    analytics({
        category: 'Downloads',
        action: 'open',
        label: 'Selection dropdown'
    });

    const downloadTriggered = ( type ) => analytics({
        category: 'Downloads',
        action: heading,
        label: type
    });

    return <>
        {
            !noCsv
                ? <a className={ 'govuk-link govuk-link--no-visited-state' }
                     onClick={ () => downloadTriggered("CSV") }
                     href={ `${ baseUrl }&format=csv` }
                     aria-disabled={ !noCsv }>
                    as CSV
                </a>
                : <span className={ 'govuk-link govuk-link--no-visited-state disabled' }>
                    as CSV
                    <span className={ "govuk-visually-hidden" }>
                        CSV format is not available for this card.
                    </span>
                </span>
        }
        <a className={ 'govuk-link govuk-link--no-visited-state' }
           href={ `${baseUrl}&format=json` }
           onClick={ () => downloadTriggered("JSON") }
           target={ '_blank' }
           rel={ 'noreferrer noopener' }>
            as JSON
        </a>
        <a className={ 'govuk-link govuk-link--no-visited-state' }
           target={ '_blank' }
           onClick={ () => downloadTriggered("XML") }
           rel={ 'noreferrer noopener' }
           href={ `${baseUrl}&format=xml` } download>
            as XML
        </a>
    </>

};  // DownloadOptions


const Card: ComponentType<Props> = ({ heading, url, children, fullWidth=false, noCsv=false }: Props) => {

    const Container = ({ ...props }) =>
        !fullWidth
            ? <HalfCard {...props}/>
            : <FullCard {...props}/>;

    return <Container>
        {
            url &&
            <DropdownButton tooltip={ "Download card data" }
                            launcherSrOnly={ "Download card data" }>
                <DownloadOptions heading={ heading } baseUrl={ url } noCsv={ noCsv }/>
            </DropdownButton>
        }
        { children }
    </Container>;

};  // Card


const MixedCardContainer: ComponentType<*> = ({ children }) => {

    return <section className={ 'util-flex util-flex-wrap' }>{ children }</section>

};  // MixedCardContainer


const usePrevious = (value) => {

    const ref = useRef(value);

    useEffect(() => {

        ref.current = value

    })

    return ref.current

};  // usePrevious


const CardContent = ({ tabs: singleOptionTabs=null, cardType, download=[], params, options=null,
                         heading, fullWidth, ...props }) => {

    const
        [ active, setActive ] = useState(options?.choices?.[0] ?? null),
        [ dataState, setDataState ] = useState(true),
        strParams = JSON.stringify(params),
        prevParams = usePrevious(strParams),
        tabs = !active
            ? (singleOptionTabs || [])
            : ( props?.[active]?.tabs ?? [] );

    let apiUrl;

    useEffect(() => {

        if ( prevParams !== strParams ) setDataState(true);

    }, [ prevParams, strParams ])


    if ( !dataState ) return null;


    switch ( cardType ) {

        case "chart":
            apiUrl = fieldToStructure(download, params);

            return <Card heading={ heading } fullWidth={ fullWidth } url={ apiUrl } dataState={ dataState }>
                <CardHeader heading={ heading } { ...props }>
                    { active && <Radio heading={ heading } options={ options } dataState={ dataState } value={ active } setValue={ setActive }/> }
                </CardHeader>
                <TabLinkContainer>{
                    tabs?.map(({ heading, ...rest }) =>
                        <TabLink key={ `tab-${ heading }` } label={ heading }>
                            <TabContent params={ params } setDataState={ setDataState } dataState={ dataState } { ...props } { ...rest }/>
                        </TabLink>
                    ) ?? null
                }</TabLinkContainer>
            </Card>;

        case "map":
            apiUrl = fieldToStructure(download, params);

            return <Card heading={ heading } fullWidth={ fullWidth } url={ apiUrl } dataState={ dataState }>
                <CardHeader heading={ heading } { ...props }>
                    { active && <Radio heading={ heading } options={ options } value={ active } setValue={ setActive }/> }
                </CardHeader>
                <TabLinkContainer>{
                    tabs?.map(({ heading: tabHeading, ...rest }, index) =>
                        <TabLink key={ `tab-${ tabHeading }-${ index }` }
                                 label={ tabHeading }>
                            <p>Not implemented.</p>
                        </TabLink>
                    ) ?? null
                }</TabLinkContainer>
            </Card>;

        case "ageSexBreakdown":
            // FixMe: Small cards need min height

            const breakdownMetrics = [...tabs]?.reverse()?.[0]?.requiredMetrics ?? [];
            // console.log(breakdownMetrics)
            apiUrl = fieldToStructure(
                breakdownMetrics.map(metric => ({value: metric})),
                params,
                [
                    { key: "latestBy", sign: "=", value: breakdownMetrics?.[0] ?? "" }
                ]

            );

            return <Card heading={ heading } fullWidth={ false } url={ apiUrl } noCsv={ true } dataState={ dataState }>
                <CardHeader heading={ heading } { ...props }/>
                <TabLinkContainer>{
                    tabs?.map(({ heading, ...rest }, index) =>
                        <TabLink key={ `tab-${ heading }-${ index }` } label={ heading }>
                            <AgeSexBreakdownTabContent setDataState={ setDataState } params={ params } { ...rest }/>
                        </TabLink>
                    ) ?? null
                }</TabLinkContainer>
            </Card>

        case "multiAreaStatic":
            apiUrl = fieldToStructure(
                download,
                // [
                //     ...[...tabs]?.reverse()?.[0]?.fields ?? [],
                //     { value: "areaName" }
                // ],
                tabs?.[0]?.params ?? []
            );

            return <Card heading={ heading } fullWidth={ fullWidth } url={ apiUrl } dataState={ dataState }>
                <CardHeader heading={ heading } { ...props }>
                    { active && <Radio heading={ heading } options={ options } value={ active } setValue={ setActive }/> }
                </CardHeader>
                <TabLinkContainer>{
                    tabs?.map(({ heading, ...rest }, index) =>
                        <TabLink key={ `tab-${ heading }-${ index }` } label={ heading }>
                            <MultiAreaStaticTabContent setDataState={ setDataState } dataState={ dataState } { ...props } { ...rest }/>
                        </TabLink>
                    ) ?? null
                }</TabLinkContainer>
            </Card>;

        default:
            return <p>Invalid chart type</p>;

    }


};  // TestingCard


export {
    Card,
    HeadlineNumbers,
    MixedCardContainer,
    CardContent,
    HalfCardSplitBody,
    CardHeader,
    VisualSection,
    ValueItem,
    ValueBox,
    NumericReports,
};
