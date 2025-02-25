// @flow

import React, { useEffect, useState, memo, useMemo } from "react";
import L from "leaflet";
import mapboxgl from "mapbox-gl";
import Loading from "components/Loading";
import URLs from "common/urls";

import 'leaflet/dist/leaflet.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
    MapContainer,
    MapToolbox,
    NumberBox,
    NumbersContainer,
    PostcodeSearchForm,
    SliderContainer
} from "./Map.styles";
import useApi from "hooks/useApi";
import moment from "moment";
import numeral from "numeral";
import {
    LegendContainer,
    ScaleColor,
    ScaleGroup,
    ScaleLegend,
    ScaleLegendLabel,
    ScaleValue
} from "pages/InteractiveMap/InteractiveMap.styles";
import bbox from "@turf/bbox";
import axios from "axios";
import MapMarker from "assets/icon-mapmarker.svg";
import useTimestamp from "hooks/useTimestamp";
import usePrevious from "hooks/usePrevious";
import GreenArrow from "assets/icon-arrow-green.svg";
import RedArrow from "assets/icon-arrow-red.svg";
import { scaleColours } from "common/utils";
import useGenericAPI from "hooks/useGenericAPI";
import type { ComponentType } from "react";


const MapLayers = [
    {
        label: "utla",
        name: "UTLA",
        paths: {
            timeSeries: `https://${URLs.baseCDN}/downloads/maps/utla_data_latest.geojson`,
            timeSeriesMobile: `https://${ URLs.baseCDN }/downloads/maps/utla_data_latest-mobile.geojson`,
            outline: `https://${ URLs.baseCDN }/downloads/maps/utla-ref.geojson`
        },
        foreground: "building",
        tolerance: .25,
        buffer: 32,
        minZoom: 1,
        maxZoom: 7,
        buckets: [
            scaleColours[0],
            10, scaleColours[1],
            50, scaleColours[2],
            100, scaleColours[3],
            200, scaleColours[4],
            400, scaleColours[5],
            800, scaleColours[6],
        ]
    },
    {
        label: "ltla",
        name: "LTLA",
        paths: {
            timeSeries: `https://${ URLs.baseCDN }/downloads/maps/ltla_data_latest.geojson`,
            timeSeriesMobile: `https://${ URLs.baseCDN }/downloads/maps/ltla_data_latest-mobile.geojson`,
            outline: `https://${ URLs.baseCDN }/downloads/maps/ltla-ref.geojson`
        },
        tolerance: .4,
        buffer: 32,
        minZoom: 7,
        maxZoom: 8.5,
        foreground: "utla",
        buckets: [
            scaleColours[0],
            10, scaleColours[1],
            50, scaleColours[2],
            100, scaleColours[3],
            200, scaleColours[4],
            400, scaleColours[5],
            800, scaleColours[6],
        ]
    },
    {
        label: "msoa",
        name: "MSOA",
        paths: {
            timeSeries: `https://${ URLs.baseCDN }/downloads/maps/msoa_data_latest.geojson`,
            timeSeriesMobile: `https://${ URLs.baseCDN }/downloads/maps/msoa_data_latest-mobile.geojson`,
            outline: `https://${ URLs.baseCDN }/downloads/maps/msoa-ref.geojson`
        },
        tolerance: .5,
        buffer: 32,
        minZoom: 8.5,
        maxZoom: 15.5,
        foreground: "ltla",
        buckets: [
            scaleColours[0],
            10, scaleColours[1],
            50, scaleColours[2],
            100, scaleColours[3],
            200, scaleColours[4],
            400, scaleColours[5],
            800, scaleColours[6],
        ]
    }
];


const Arrow = ({ direction }) => {

    let angle, altText, ArrowImage;

    switch ( direction ) {
        case "UP":
            angle = 0;
            ArrowImage = RedArrow;
            altText = "The rate has increased relative to the previous week.";
            break;
        case "DOWN":
            angle = 180;
            ArrowImage = GreenArrow;
            altText = "The rate has decreased relative to the previous week.";
            break;
        case "SAME":
        default:
            angle = 90;
            ArrowImage = GreenArrow;
            altText = "The rate has not changed relative to the previous week.";
            break;
    }

    return <img src={ ArrowImage }
                width={ "14px" } alt={ altText }
                style={ { transform: `rotate(${ angle }deg)`, marginRight: 5 } }/>;

};

const InfoCard = ({ areaName, date, rollingRate, totalThisWeek, totalChange, trend, postcode,
                      percentageChange, areaType, areaCode, setShowInfo, maxDate, ...props }) => {


    if ( !setShowInfo ) return null;

    return <MapToolbox>
        <button style={{ position: "absolute", top: 3, right: 8, margin: 0, padding: 0, cursor: "pointer", fontSize: 1.5 + "rem" }}
                role={ "button" }
                onClick={ () => setShowInfo(false) }>×</button>
        <h2 className={ 'govuk-heading-m' }>
            { areaName }
            <small className={ "govuk-caption-s" }>
                {areaType.toUpperCase()} <br/>
                Seven days to { moment(date).format("DD MMMM YYYY") }
            </small>
        </h2>
        { typeof totalThisWeek === "number"
            ? <>
                <NumbersContainer>
                    <NumberBox>
                        <h3 className={ "govuk-heading-s" }>Total cases</h3>
                        <div className={ "number-row" }>
                            <span className={ "number" }>{ totalThisWeek }</span>
                            <strong className={ `govuk-tag ${ percentageChange > 0 ? "red" : "green" } number` }>
                                <Arrow direction={ trend }/>
                                { numeral(totalChange).format("0,0") }&nbsp;{ `(${ numeral(percentageChange).format("0,0.0") }%)` }
                            </strong>
                        </div>
                    </NumberBox>
                    <NumberBox>
                        <h3 className={ "govuk-heading-s" }>Case rate per 100,000 people</h3>
                        <div className={ "number-row" }>
                            <span className={ "number" }>{ numeral(rollingRate).format("0,0.0") }</span>
                        </div>
                    </NumberBox>
                </NumbersContainer>
                {/* {
                    date !== maxDate
                        ? null
                        : <>
                            <h3 className={ "govuk-heading-s" }>Case rate compared
                                to { areaType === "msoa" ? "England" : "the UK" } average</h3>
                            <img
                                src={ `https://coronavirus.data.gov.uk/public/assets/frontpage/scales/${ areaType }/${ areaCode }.svg` }
                                style={ { maxWidth: viewPort === "mobile" ? 250 : 300, marginBottom: -15 } }
                                alt={ `Scale showing the comparison of ${ areaName } compared to national average.` }/>
                        </>
                } */}
            </>
            : <p>{
                areaType === "msoa"
                    ? <>
                        Under 3 cases. For smaller areas (MSOAs) with fewer than 3 cases, we do not show data. This is to protect individuals' identities.
                    </>
                    : "Data missing."
            }</p>
        }
        {
            postcode &&
            <p className={ "govuk-body-s govuk-!-margin-top-1 govuk-!-margin-bottom-0" }>
                <a className={ "govuk-link govuk-link--no-visited-state" }
                   target={ "_blank" }
                   rel={ "noopener noreferrer" }
                   href={ `/search?postcode=${postcode.replace(/[\s]/gi, "")}` }>
                    See more data for { postcode }
                </a>
            </p>
        }
    </MapToolbox>

};  // InfoCard


const SoaCard = ({ currentLocation, postcodeData, date, areaType, ...props }) => {

    const
        apiData = useGenericAPI(
            "genericApiSoa",
            null,
            {
                area_type: "msoa",
                area_code: currentLocation,
                metric: "newCasesBySpecimenDate"
            },
            "json",
            {date}
        ),
        locationData = useGenericAPI(
            "genericApiCode",
            null,
            { area_type: "msoa", area_code: currentLocation }
        );

    if ( !locationData || !currentLocation || !apiData )
        return <MapToolbox><Loading/></MapToolbox>;

    return <InfoCard areaName={ locationData?.msoaName ?? "" }
                     date={ date }
                     totalThisWeek={ apiData?.payload?.rollingSum ?? null }
                     rollingRate={ apiData?.payload?.rollingRate }
                     percentageChange={ apiData?.payload?.changePercentage }
                     totalChange={ apiData?.payload?.change }
                     areaCode={ currentLocation }
                     areaType={ areaType }
                     trend={ apiData?.payload?.direction }
                     postcode={ currentLocation === postcodeData?.msoa ? postcodeData.postcode : null }
                     { ...props }/>

};


const LocalAuthorityCard = ({ currentLocation, date, areaType, ...props }) => {

    const
        timestamp = useTimestamp(),
        dataDate = moment(date),
        apiData = useApi({
            ...(areaType !== "msoa" && timestamp !== "" )
                ? {
                    conjunctiveFilters: [
                        { key: "areaCode", sign: "=", value: currentLocation },
                        { key: "areaType", sign: "=", value: areaType },
                        {
                            key: "date",
                            sign: "=",
                            value: dataDate.format("YYYY-MM-DD")
                        },
                    ],
                }
                : {},
            cache: true,
            structure: {
                date: "date",
                name: "areaName",
                type: "areaType",
                value: "newCasesBySpecimenDate",
                rollingRate: "newCasesBySpecimenDateRollingRate",
                rollingSum: "newCasesBySpecimenDateRollingSum",
                change: "newCasesBySpecimenDateChange",
                direction: "newCasesBySpecimenDateDirection",
                percentage: "newCasesBySpecimenDateChangePercentage",
            },
            defaultResponse: null
        });

    if ( !currentLocation || areaType === "msoa" ) return null;

    if ( !apiData )
        return <MapToolbox><Loading/></MapToolbox>;

    const data = apiData[0];

    return <InfoCard areaName={ data.name }
                     date={ data.date }
                     totalThisWeek={ data.rollingSum }
                     rollingRate={ data.rollingRate }
                     percentageChange={ data.percentage }
                     totalChange={ data.change }
                     areaCode={ currentLocation }
                     areaType={ areaType }
                     trend={ data.direction }
                     { ...props }/>

};


const Component = memo( ( props )=> <div {...props} id={ "cases-map-container" }/>);


const Map: ComponentType<*> = ({ data, geoKey, isRate = true, scaleColours, geoJSON, geoData, date,
                                   extrema, minData, maxData, valueIndex, children, dates, maxDate, width, ...props }) => {

    const
        bounds = new L.LatLngBounds(new L.LatLng(50.5, -14.5), new L.LatLng(58.8, 10)),
        centrePoint = bounds.getCenter(),
        [map, setMap] = useState(null),
        [styleDataStatus, setStyleDataStatus] = useState(false),
        [showInfo, setShowInfo] = useState(false),
        [postcodeData, setPostcodeData] = useState(null),
        [currentLocation, setCurrentLocation] = useState({ currentLocation: null, areaType: "utla" }),
        [zoomLayerIndex, setZoomLayerIndex] = useState(0),
        prevAreaType = usePrevious(currentLocation.areaType);

    let hoveredStateId = null;

    const filterBy = (date: string) => {

        const filters = ['==', 'date', date.split(/T/)[0]];

        if ( map )
            MapLayers.map(layer => {
                const mapLayer = map.getLayer(`choropleth-${layer.label}`);

                if ( mapLayer ) map.setFilter(`choropleth-${layer.label}`, filters);

            });

    };

    useEffect(() => {
        if ( !map ) {
            setMap(new mapboxgl.Map({
                container: 'cases-map-container',
                style: URLs.mapStyle,
                center: centrePoint,
                zoom: 4.9,
                minZoom: 4.9,
                maxZoom: 15,
                preserveDrawingBuffer: true
            }));
        }
    }, []);

    useMemo(() => {

        if ( map && !styleDataStatus ) {

            map.once("style.load", function () {

                MapLayers.map( layer => {
                    map.addSource(`timeSeries-${layer.label}`, {
                        type: 'geojson',
                        data: width === "desktop" ? layer.paths.timeSeries : layer.paths.timeSeriesMobile,
                        buffer: layer.buffer,
                        tolerance: layer.tolerance,
                        maxzoom: layer.maxZoom
                    });

                    map.addSource(`geo-${layer.label}`, {
                        type: 'geojson',
                        data: layer.paths.outline,
                        buffer: layer.buffer,
                        tolerance: layer.tolerance,
                        maxzoom: layer.maxZoom
                    });
                });

                MapLayers.map( layer => {
                    map.addLayer({
                        'id': layer.label,
                        'type': 'line',
                        'source': `geo-${layer.label}`,
                        'minzoom': layer.minZoom,
                        'maxzoom': layer.maxZoom,
                        'layout': {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        'paint': {
                            'line-color': '#000000',
                            'line-width': [
                                'case',
                                ['boolean', ['feature-state', 'hover'], false],
                                3,
                                .1
                            ]
                        }
                    }, layer.foreground);

                    map.addLayer({
                        'id': `choropleth-${layer.label}`,
                        'type': 'fill',
                        "fill-antialias": true,
                        'source': `timeSeries-${layer.label}`,
                        'minzoom': layer.minZoom,
                        'maxzoom': layer.maxZoom,
                        'paint': {
                            'fill-color': [
                                "step",
                                ['get', 'value'],
                                ...layer.buckets,
                            ],
                            'fill-opacity': 1,
                        }
                    }, layer.label);

                    map.addLayer({
                        'id': `${layer.label}-click`,
                        'type': 'fill',
                        'source': `geo-${layer.label}`,
                        'minzoom': layer.minZoom,
                        'maxzoom': layer.maxZoom,
                        'paint': {
                            'fill-color': "#ffffff",
                            'fill-opacity': .001
                        },
                    }, `choropleth-${layer.label}`);

                    map.on('click', `${layer.label}-click`, function (e) {

                        setCurrentLocation(prev => ({
                            ...prev,
                            currentLocation: e.features[0].properties.code
                        }));
                        setShowInfo(true);

                        const outlineId = map
                            .queryRenderedFeatures({ layers: [layer.label] })
                            .find(item => item.properties.code === e.features[0].properties.code)
                            .id;

                        if ( hoveredStateId?.id ) {
                            map.setFeatureState(
                                { source: `geo-${ hoveredStateId.location }`, id: hoveredStateId.id },
                                { hover: false }
                            );
                        }

                        hoveredStateId = {
                            id: outlineId,
                            location: layer.label
                        };

                        map.setFeatureState(
                            { source: `geo-${ hoveredStateId.location }`, id: hoveredStateId.id },
                            { hover: true }
                        );

                        map.fitBounds(bbox(e.features[0]), {
                            padding: 20,
                            maxZoom: Math.max(map.getLayer(layer.label).minzoom + 0.5, map.getZoom())
                        });

                    });

                });

                map.on('zoom', function() {

                    const zoomLevel = map.getZoom();

                    if ( zoomLevel < 7 ) {
                        setZoomLayerIndex(0);
                    }
                    else if ( zoomLevel >= 7 && zoomLevel < 8.5 ) {
                        setZoomLayerIndex(1);
                    }
                    else if ( zoomLevel >= 8.5 ) {
                        setZoomLayerIndex(2);
                    }

                });

                map.on('styledata', function (e) {
                    setStyleDataStatus(true)
                });

                map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
                map.addControl(new mapboxgl.FullscreenControl());

                // disable map rotation using right click + drag
                map.dragRotate.disable();

                // disable map rotation using touch rotation gesture
                map.touchZoomRotate.disableRotation();

            })
        }
    }, [map]);

    useEffect(() => {

        if ( styleDataStatus ) filterBy(date)

    }, [date, styleDataStatus]);

    // useEffect(() => {
    //     if ( map ) {
    //         map.remove();
    //     }
    // }, [ date ]);

    useEffect(() => {

        if ( map && postcodeData ) {

            setShowInfo(true);
            const el = document.createElement("div");
            el.className = "marker";
            el.style.backgroundImage = `url(${MapMarker})`;
            el.style.backgroundRepeat = "no-repeat";
            el.style.backgroundSize = "100% 100%";
            el.style.width = "70px";
            el.style.height = "70px";

            new mapboxgl.Marker(el, {anchor: "bottom"})
                .setLngLat(postcodeData.geometry.coordinates)
                .addTo(map);

            map.flyTo({
                center: [
                    postcodeData.geometry.coordinates[0],
                    postcodeData.geometry.coordinates[1]
                ],
                zoom: 12.5
            });

                // console.log(postcodeData)
            // setShowInfo(true);
        }

    }, [postcodeData, map]);


    useEffect(() => {

        if ( currentLocation?.areaType === "msoa" ) {

            setCurrentLocation(prev => ({
                ...prev,
                currentLocation: postcodeData?.msoa
            }))

        }

    }, [ postcodeData, currentLocation?.areaType ]);

    useEffect(() => {
        setCurrentLocation(prev => ({
            ...prev,
            areaType: MapLayers[zoomLayerIndex].label
        }));
    }, [ zoomLayerIndex, currentLocation.currentLocation ]);

    function downloadImage (e) {
        e.target.href =  map.getCanvas().toDataURL('image/png');
    }

    return <>
        <SliderContainer>
            { children }
        </SliderContainer>
        <MapContainer>
            {/*{ isLoading && <Loading/> }*/}
            {/*<div id={ "map" }/>*/}
            <Component/>
            {
                // !isLoading &&
                <>
                    <PostcodeSearchForm onSubmit={  (e) => {
                            e.preventDefault();
                            const postcode: string = document.getElementById("postcode").value;
                            (async () => {
                                const { data } = await axios.get(URLs.postcode, {
                                    params: {
                                        category: "postcode",
                                        search: postcode.replace(/\s/, "").toUpperCase().trim()
                                    }
                                });
                                setPostcodeData(data)
                            })();
                        } }>
                        <label htmlFor={ "postcode" }
                               className={ "govuk-visually-hidden" }>
                            Search by postcode
                        </label>
                        <input className={ "govuk-input govuk-input--width-10" }
                               name={ "postcode" }
                               maxLength={ 10 }
                               type={ "text" }
                               id={ "postcode" }
                               pattern={ "[A-Za-z]{1,2}\\d{1,2}[A-Za-z]?\\s?\\d{1,2}[A-Za-z]{1,2}\\s{0,2}" }
                               placeholder={ "Postcode" }/>
                        <label htmlFor={ "submit-postcode" }
                               className={ "govuk-visually-hidden" }>
                            Search by postcode
                        </label>
                        <input name={ "submit-postcode" }
                               className={ "govuk-button" }
                               id={ "submit-postcode" }
                               type={ "submit" }
                               value={ "" }/>
                    </PostcodeSearchForm>
                    <LegendContainer>
                        <ScaleLegend>
                            <ScaleLegendLabel>Case rate</ScaleLegendLabel>
                            <ScaleGroup>
                                <ScaleColor style={{ background: "#fff" }}/>
                                <ScaleValue>{
                                    "Data not shown"
                                }</ScaleValue>
                            </ScaleGroup>
                            {

                                MapLayers[zoomLayerIndex].buckets.map( (item, index) => {
                                    const firstValue = MapLayers[zoomLayerIndex].buckets?.[index - 2] ?? 0;
                                    if ( index % 2 > 0 ) {
                                        return <ScaleGroup key={ `legend-${index}` }>
                                            <ScaleColor style={ { background: MapLayers[zoomLayerIndex].buckets?.[index - 1] ?? 0 } }/>
                                            <ScaleValue>
                                                {
                                                    (MapLayers[zoomLayerIndex].label === "msoa" && index === 1)
                                                        ? 0
                                                        : firstValue === 0
                                                        ? 0
                                                        : firstValue
                                                }
                                                &nbsp;&ndash;&nbsp;
                                                { MapLayers[zoomLayerIndex].buckets?.[index] - 1 ?? "+" }
                                            </ScaleValue>
                                        </ScaleGroup>
                                    }
                                })
                            }
                            <ScaleGroup>
                                <ScaleColor style={ { background: MapLayers[zoomLayerIndex].buckets.slice(-1) } }/>
                                <ScaleValue>
                                    { MapLayers[zoomLayerIndex].buckets.slice(-2, -1)[0] }&nbsp;+
                                </ScaleValue>
                            </ScaleGroup>
                        </ScaleLegend>
                    </LegendContainer>
                </>

            }
            {
                (currentLocation.areaType !== prevAreaType || !showInfo)
                    ? null
                    : currentLocation.areaType !== "msoa"
                    ? <LocalAuthorityCard { ...currentLocation } date={ date } maxDate={ maxDate } setShowInfo={ setShowInfo }/>
                    : <SoaCard { ...currentLocation }
                               date={ date }
                               postcodeData={ postcodeData }
                               maxDate={ maxDate }
                               setShowInfo={ setShowInfo }/>
            }
            </MapContainer>
        <span style={{ textAlign: "right" }}>
            <a onClick={ downloadImage }
               className={"govuk-button govuk-!-margin-top-3 govuk-!-margin-bottom-1"}
               data-module={"govuk-button"}
               download={ `cases_${date}.png` } href={ "" }>Download image</a></span>
    </>;

};  // Map


export default Map;
