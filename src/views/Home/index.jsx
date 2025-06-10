import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import homeActions, { Types as homeTypes } from "../../actions/home";
import { loadingSelector } from "../../selectors/loader";

export default function Home() {
  const dispatch = useDispatch();
  const count = useSelector((state) => state.home.count);
  const publicData = useSelector((state) => state.home.publicData);
  const isLoading = useSelector(
    loadingSelector([homeTypes.GET_PUBLIC_DATA_REQUEST])
  );
  console.log(publicData, isLoading, "data in views");

  useEffect(() => {
    dispatch(
      homeActions.getPublicDataRequest("418", {
        start: "2024-06-05",
        end: "2024-12-05",
      })
    );
    dispatch(homeActions.incrementCountAsync());
  }, [dispatch]);

  return (
    <div>
      <p>Count: {count}</p>
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Data Table</h2>

        <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {publicData?.areas?.map((item, index) => (
                <tr
                  key={index}
                  className={`${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-blue-50 transition-colors duration-200`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.visitors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
