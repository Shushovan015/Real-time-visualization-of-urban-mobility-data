import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import MapView from "../../components/Mapview";
import { useDispatch, useSelector } from "react-redux";
import homeActions, { Types as homeTypes } from "../../actions/home";
import { loadingSelector } from "../../selectors/loader";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  // start here
  const dispatch = useDispatch();
  const publicData = useSelector((state) => state.home.publicData);
  const isLoading = useSelector(
    loadingSelector([homeTypes.GET_PUBLIC_DATA_REQUEST])
  );

  useEffect(() => {
    dispatch(homeActions.getPublicDataRequest());
  }, [dispatch]);

  return (
    <div className={`container ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <Sidebar />
      <div className="main">
        <div className="map-container">
          <MapView
            toggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
            data={publicData}
          />
        </div>
      </div>
    </div>
  );
}
