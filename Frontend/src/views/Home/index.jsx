import React, { use, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import homeActions, { Types as homeTypes } from "../../actions/home";
import { loadingSelector } from "../../selectors/loader";
import { enrichedLiveSelector } from "../../selectors/home";

import useDebouncedInput from "../../components/customHooks/useDebouncedInput";

import MapView from "../../components/Mapview";

const CrowdVisualizationUI = () => {
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(null);
  const dispatch = useDispatch();
  const publicData = useSelector((state) => state.home.publicData);
  const pastData = useSelector((state) => state.home.pastData);
  const placesData = useSelector((state) => state.home.placesData);
  const userLocation = useSelector((state) => state.home.userLocation);
  const enrichedLive = useSelector(enrichedLiveSelector);
  // const publicDataPerMinute = useSelector(
  //   (state) => state.home.publicDataPerMinute
  // );
  // const isLoading = useSelector(
  //   loadingSelector([homeTypes.GET_PUBLIC_DATA_PER_MINUTE_REQUEST]),
  //   loadingSelector([homeTypes.GET_PAST_DATA_REQUEST])
  // );

  // const [minutes, debouncedMinutes, handleMinutesChange] = useDebouncedInput({
  //   ms: 500,
  //   init: 0,
  // });

  useEffect(() => {
    dispatch(homeActions.getPublicDataRequest());
    dispatch(homeActions.getPastDataRequest());
    dispatch(homeActions.getPlacesDataRequest());
    dispatch(homeActions.getAllHourlyHistoryDataRequest());
    // dispatch(
    //   homeActions.getNowNextDataRequest({
    //     // lat: userLocation.lat,
    //     // lon: userLocation.lon,
    //     lat: 49.8926,
    //     lon: 10.8879,
    //   })
    // );
  }, [dispatch]);

  const mapData =
    selectedFrameIndex === null
      ? enrichedLive
      : pastData[selectedFrameIndex] || { data: [] };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        background: "#000",
      }}
    >
      <div style={{ flex: 1, position: "relative" }}>
        <MapView
          data={mapData}
          minutes={selectedFrameIndex}
          onMinutesChange={setSelectedFrameIndex}
        />
      </div>
    </div>
  );
};

export default CrowdVisualizationUI;
