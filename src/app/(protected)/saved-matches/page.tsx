import { getSavedMatchesService } from "@/features/matches/matches.services";
import { SavedMatchesTable } from "./_components/saved-matches-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SavedMatchesPage() {
  const myMatches = await getSavedMatchesService();
  return (
    <div className="col-span-12">
      <Card>
        <CardHeader>
          <CardTitle>My Saved Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <SavedMatchesTable myMatches={myMatches} />
        </CardContent>
      </Card>
    </div>
  );
}
