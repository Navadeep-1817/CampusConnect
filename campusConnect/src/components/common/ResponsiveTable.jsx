import React from 'react';

/**
 * Responsive Table Component
 * Automatically converts to card view on mobile devices
 */
const ResponsiveTable = ({ headers, data, renderRow, renderCard, loading, emptyMessage }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage || 'No data found'}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => renderRow(item, index))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Hidden on desktop */}
      <div className="md:hidden space-y-4 p-4">
        {data.map((item, index) => renderCard(item, index))}
      </div>
    </>
  );
};

export default ResponsiveTable;
