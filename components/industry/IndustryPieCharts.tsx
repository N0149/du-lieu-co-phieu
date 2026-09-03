'use client'

import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import type { PieChartItem } from '@/lib/industry-types'

interface IndustryPieChartsProps {
  marketCapPie: PieChartItem[]
  lnstPie: PieChartItem[]
  quarterLabel?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  unitName?: string
}

function CustomPieTooltip({ active, payload, unitName = 'Vốn hóa' }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload as PieChartItem
    return (
      <div className="rounded-xl border border-white/15 bg-[#1a1f2c]/95 p-3 text-xs shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-[#F0F3F6]">
          <span
            className="inline-block size-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.name}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-4 text-[#9EACB9]">
          <span>{unitName}:</span>
          <span className="font-semibold text-emerald-400">{item.formattedValue}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[#9EACB9]">
          <span>Tỷ trọng:</span>
          <span className="font-bold text-[#F0F3F6]">{item.percent}%</span>
        </div>
      </div>
    )
  }
  return null
}

export function IndustryPieCharts({ marketCapPie, lnstPie, quarterLabel = 'Gần Nhất' }: IndustryPieChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* 1. Biểu đồ Cơ cấu Vốn hóa */}
      <div className="flex flex-col rounded-2xl border border-white/8 bg-[#161a23] p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#F0F3F6] sm:text-base">
              Cơ cấu vốn hóa theo ngành
            </h3>
            <p className="text-xs text-[#8B98A5]">
              Tỷ trọng quy mô vốn hóa giữa các nhóm ngành ICB
            </p>
          </div>
        </div>

        <div className="relative mt-2 h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={marketCapPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                animationDuration={600}
              >
                {marketCapPie.map((entry) => (
                  <Cell
                    key={`cap-${entry.code}`}
                    fill={entry.color}
                    stroke="#161a23"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip unitName="Vốn hóa" />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
          {marketCapPie.map((item) => (
            <div key={item.code} className="flex items-center gap-1.5 truncate">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-[#9EACB9]" title={item.name}>
                {item.name}
              </span>
              <span className="ml-auto font-semibold text-[#F0F3F6]">
                {item.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Biểu đồ Cơ cấu LNST Quý */}
      <div className="flex flex-col rounded-2xl border border-white/8 bg-[#161a23] p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#F0F3F6] sm:text-base">
              Cơ cấu LNST quý theo ngành ({quarterLabel})
            </h3>
            <p className="text-xs text-[#8B98A5]">
              Đóng góp lợi nhuận sau thuế của các ngành trong kỳ
            </p>
          </div>
        </div>

        <div className="relative mt-2 h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={lnstPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                animationDuration={600}
              >
                {lnstPie.map((entry) => (
                  <Cell
                    key={`lnst-${entry.code}`}
                    fill={entry.color}
                    stroke="#161a23"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip unitName="LNST quý" />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
          {lnstPie.map((item) => (
            <div key={item.code} className="flex items-center gap-1.5 truncate">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-[#9EACB9]" title={item.name}>
                {item.name}
              </span>
              <span className="ml-auto font-semibold text-[#F0F3F6]">
                {item.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
