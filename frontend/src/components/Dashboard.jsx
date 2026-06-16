import React from 'react';
import DashboardHeader from './DashboardHeader';
import CollectionCards from './CollectionCards';
import TodayTasks from './TodayTasks';
import GoalCalendar from './GoalCalendar';
import PomodoroWidget from './PomodoroWidget';
import HabitsWidget from './HabitsWidget';
import WaterWidget from './WaterWidget';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CollectionCards />
          <TodayTasks />
          <GoalCalendar />
        </div>
        <div className="space-y-6">
          <PomodoroWidget />
          <HabitsWidget />
          <WaterWidget />
        </div>
      </div>
    </div>
  );
}
